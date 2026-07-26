import { NextRequest, NextResponse } from 'next/server';

/**
 * Reverse proxy: /api/tailux/* → http://localhost:5173/*
 *
 * This lets the tailux Vite dev server (running on port 5173) be reachable
 * from the public preview URL of the Next.js app.
 *
 * The Frontend Apps grid launches the course builder by opening
 * /api/tailux/apps/course-builder in an iframe.
 *
 * IMPORTANT: We rewrite asset URLs in the HTML/JS/CSS responses so that
 * Vite's absolute paths (e.g. "/@vite/client", "/src/main.tsx") point back
 * through this proxy (/api/tailux/@vite/client, /api/tailux/src/main.tsx).
 */

const TAILUX_ORIGIN = 'http://localhost:5173';

// Headers we should pass through from the upstream response
const PASSTHROUGH_HEADERS = new Set([
  'content-type',
  'cache-control',
  'etag',
  'last-modified',
]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathParts } = await params;
  const path = '/' + (pathParts || []).join('/');
  const url = new URL(path, TAILUX_ORIGIN);
  // IMPORTANT: Next.js normalizes the query string. `?import&react` (Vite's
  // SVGR marker) becomes `?import=&react=` (with empty values) by the time
  // we see it. We need to convert it back so Vite's SVGR plugin recognizes it.
  // Strategy: for each searchParam with an empty value, treat it as a bare key.
  const correctedParams: string[] = [];
  req.nextUrl.searchParams.forEach((value, key) => {
    if (value === '') {
      correctedParams.push(key);
    } else {
      correctedParams.push(`${key}=${value}`);
    }
  });
  if (correctedParams.length > 0) {
    url.search = '?' + correctedParams.join('&');
  }

  try {
    // Forward all relevant headers from the browser's request so Vite/SVGR
    // processes requests correctly (e.g. Accept: */* for scripts vs assets).
    const forwardedHeaders: Record<string, string> = {
      accept: req.headers.get('accept') || '*/*',
      'user-agent': req.headers.get('user-agent') || 'nextjs-proxy',
    };
    // Pass through Sec-Fetch-* headers (Vite uses these to detect script requests)
    ['sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site', 'referer', 'origin'].forEach((h) => {
      const v = req.headers.get(h);
      if (v) forwardedHeaders[h] = v;
    });

    const upstream = await fetch(url, {
      headers: forwardedHeaders,
      redirect: 'manual', // we'll handle redirects ourselves
    });

    // Handle redirects: rewrite Location header to go through proxy
    if ([301, 302, 307, 308].includes(upstream.status)) {
      const loc = upstream.headers.get('location');
      if (loc) {
        const rewritten = rewriteUrl(loc);
        return NextResponse.redirect(rewritten, { status: upstream.status as any });
      }
    }

    const contentType = upstream.headers.get('content-type') || '';
    const buf = Buffer.from(await upstream.arrayBuffer());

    // For HTML, JS, CSS — rewrite absolute URLs to route through /api/tailux.
    // IMPORTANT: skip SVG (image/svg+xml) because the rewrite would corrupt
    // internal path data. Also skip data: URLs (which we don't want to touch).
    let body: Buffer | string = buf;
    const isRewritable =
      (contentType.includes('text/html') ||
        contentType.includes('javascript') ||
        contentType.includes('css') ||
        (contentType.includes('text') && !contentType.includes('svg'))) &&
      !contentType.includes('image/svg');
    if (isRewritable) {
      body = rewriteAssetPaths(buf.toString('utf-8'));
    }

    const res = new NextResponse(body as any, { status: upstream.status });
    // Pass through relevant headers
    upstream.headers.forEach((value, key) => {
      if (PASSTHROUGH_HEADERS.has(key.toLowerCase())) {
        res.headers.set(key, value);
      }
    });
    return res;
  } catch (err: any) {
    return NextResponse.json(
      {
        error: 'tailux proxy failed',
        detail: err.message,
        target: url.toString(),
        note: 'Is the tailux dev server running on http://localhost:5173? Run: cd /home/z/my-project/repos/tailux/tailux-main && npm run dev',
      },
      { status: 502 },
    );
  }
}

/**
 * Rewrite absolute asset paths so they route through the proxy.
 *
 * Vite serves things like:
 *   /@vite/client        (HMR client)
 *   /src/main.tsx        (entry)
 *   /node_modules/.vite/deps/react.js  (deps)
 *
 * In the proxied HTML, these become:
 *   /api/tailux/@vite/client
 *   /api/tailux/src/main.tsx
 *   /api/tailux/node_modules/.vite/deps/react.js
 */
function rewriteAssetPaths(content: string): string {
  // Strategy: any quoted string starting with "/" that isn't already "/api/tailux/"
  // and isn't "//" (protocol-relative) gets "/api/tailux" prepended.
  //
  // We handle: "..." and '...' quoted strings.
  // We DO NOT touch:
  //   - "data:..." URLs (SVG/CSS data URIs)
  //   - strings already starting with "/api/tailux/"
  //   - strings starting with "//" (protocol-relative)
  //   - strings starting with "http:" or "https:" (absolute URLs)
  //   - strings that are part of source map data URLs (data:application/json;base64,...)

  let out = content;

  // Replace "/something" → "/api/tailux/something"
  // But preserve data: URLs (which may contain slashes)
  // IMPORTANT:
  //   - [^"'\n]* prevents the regex from matching across newlines
  //   - Only rewrite paths that look like Vite assets: /@vite, /src, /node_modules
  //     (NOT /home/user/... absolute filesystem paths, which Vite includes in dev
  //     source maps and React Refresh registration calls)
  out = out.replace(
    /(["'])((?:data:|https?:|\/\/|\/api\/tailux\/)?[^"'\n]*)\1/g,
    (match, quote, inner) => {
      // Skip if starts with data:, http, //, or /api/tailux/
      if (
        inner.startsWith('data:') ||
        inner.startsWith('http') ||
        inner.startsWith('//') ||
        inner.startsWith('/api/tailux/')
      ) {
        return match;
      }
      // Only rewrite Vite-style asset paths (incl. virtual modules like /@vite, /@react-refresh, /@fs/)
      if (
        inner.startsWith('/@') ||
        inner.startsWith('/src/') ||
        inner.startsWith('/node_modules/')
      ) {
        return `${quote}/api/tailux${inner}${quote}`;
      }
      return match;
    },
  );

  // sourceMappingURL at end of JS: //# sourceMappingURL=/foo.map
  // (the regex above should handle this if it's quoted, but some aren't)
  out = out.replace(
    /sourceMappingURL=(\/(?!api\/tailux\/))([^\s*"']+)/g,
    'sourceMappingURL=/api/tailux/$2',
  );

  // CSS url(...) without quotes — url(/foo)
  out = out.replace(
    /url\((\/(?!api\/tailux\/))[^\s)]+\)/g,
    (match, p1) => match.replace(p1, '/api/tailux/'),
  );

  return out;
}

/**
 * Rewrite a Location header URL to route through the proxy.
 */
function rewriteUrl(loc: string): string {
  if (loc.startsWith('/')) {
    return '/api/tailux' + (loc.startsWith('/') ? '' : '/') + loc;
  }
  try {
    const u = new URL(loc);
    if (u.origin === TAILUX_ORIGIN) {
      return '/api/tailux' + u.pathname + u.search + u.hash;
    }
  } catch {}
  return loc;
}
