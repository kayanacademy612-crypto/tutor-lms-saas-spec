/**
 * Phase 4 Pro Authoring React hooks — thin wrappers around the Pro Authoring
 * resource groups exposed by `lmsApi` (certificate layers / backdrops / media,
 * certificate templates + issue/revoke/verify flows, content drip, course
 * prerequisites, multi-instructor assignments, assignment grading).
 *
 * Design choices (mirrors `src/hooks/useLms.ts` and `src/hooks/useEcommerce.ts`):
 *   - Plain `useState` + `useEffect` (no React Query).
 *   - Each query hook returns `{ data, loading, error, refetch }`.
 *   - Each mutation hook returns `{ data, loading, error, mutate, reset }`.
 *   - Query hooks that take an `id` skip the fetch while `id` is empty so
 *     they're safe to mount before the route param is populated.
 *   - Query hooks that take `params` refetch when the stringified `params`
 *     change (via the local `argsKey` helper).
 *   - `useIsMounted` + a per-fetch token ref guard against setState-after-
 *     unmount and stale-response-overwrite races.
 *   - List endpoints normalize `T[] | PaginatedResponse<T>` to `T[]` so
 *     callers always get an array (matches the convention in `useLms.ts`).
 *
 * Mutations that operate on a server-side resource pass the resource id at
 * `mutate(...)` time (via the vars object) instead of capturing it at hook
 * construction. This keeps the hooks reusable across rows in a list/table —
 * e.g. `useDeleteCertificateLayer()` can be mounted once and called for any
 * layer id.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useIsMounted } from "@/hooks/useIsMounted";
import type {
  UseLmsMutationResult,
  UseLmsQueryResult,
} from "@/hooks/useLms";
import { lmsApi, type LmsApiError } from "@/services/lms-api";
import type {
  Assignment,
  AssignmentGrade,
  AssignmentGradeInput,
  AssignmentListParams,
  AssignmentSubmission,
  Certificate,
  CertificateAssignInput,
  CertificateBackdrop,
  CertificateLayer,
  CertificateLayerCreateInput,
  CertificateMedia,
  CertificateMediaType,
  CertificatePreviewInput,
  CertificateTemplate,
  CertificateTemplateCreateInput,
  CourseInstructor,
  CourseInstructorCreateInput,
  DripRule,
  DripRuleCreateInput,
  ListParams,
  PrerequisiteChain,
  PrerequisiteChainCreateInput,
} from "@/types/lms";

// ---------------------------------------------------------------------------
// Internal helper: stable fetch key from the args array (mirrors useLms.ts).
// ---------------------------------------------------------------------------

function argsKey(args: unknown[]): string {
  return args
    .map((a) =>
      a === undefined
        ? ""
        : typeof a === "object"
          ? JSON.stringify(a)
          : String(a),
    )
    .join("|");
}

/**
 * Normalize the response of a list endpoint that may return either a bare
 * array or a `PaginatedResponse<T>` envelope into a bare array.
 */
function toList<T>(
  result: T[] | { data?: T[] } | undefined | null,
): T[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object" && "data" in result) {
    return (result as { data?: T[] }).data ?? [];
  }
  return [];
}

// ===========================================================================
// Certificate Layers (visual canvas editor)
// ===========================================================================

/**
 * `GET /api/lms/certificates/templates/{templateId}/layers` — list the layers
 * that compose a certificate template's canvas.
 */
export function useCertificateLayers(
  templateId: string | undefined,
): UseLmsQueryResult<CertificateLayer[]> {
  const [data, setData] = useState<CertificateLayer[] | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(templateId));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!templateId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.certificateLayer.list(templateId);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [templateId, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([templateId])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/certificates/layers` — add a new layer to a template's canvas.
 */
export function useCreateCertificateLayer(): UseLmsMutationResult<
  CertificateLayer,
  CertificateLayerCreateInput
> {
  const [data, setData] = useState<CertificateLayer | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: CertificateLayerCreateInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.certificateLayer.create(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `PATCH /api/lms/certificates/layers/{id}` — patch a layer (position, style,
 * content, data binding). Pass `{ id, input }` at `mutate(...)` time so a
 * single hook instance can edit any layer on the canvas.
 */
export function useUpdateCertificateLayer(): UseLmsMutationResult<
  CertificateLayer,
  { id: string; input: Partial<CertificateLayerCreateInput> }
> {
  const [data, setData] = useState<CertificateLayer | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      id: string;
      input: Partial<CertificateLayerCreateInput>;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.certificateLayer.update(
          vars.id,
          vars.input,
        );
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `DELETE /api/lms/certificates/layers/{id}` — remove a layer. Pass the `id`
 * at `mutate(...)` time.
 */
export function useDeleteCertificateLayer(): UseLmsMutationResult<
  { success: boolean },
  string
> {
  const [data, setData] = useState<{ success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.certificateLayer.delete(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `POST /api/lms/certificates/templates/{templateId}/layers/reorder` —
 * persist a new sort order for the canvas layers. Pass
 * `{ templateId, layerIds }` at `mutate(...)` time. Returns the updated layer
 * list in the new order.
 */
export function useReorderCertificateLayers(): UseLmsMutationResult<
  CertificateLayer[],
  { templateId: string; layerIds: string[] }
> {
  const [data, setData] = useState<CertificateLayer[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { templateId: string; layerIds: string[] }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.certificateLayer.reorder(
          vars.templateId,
          vars.layerIds,
        );
        if (isMounted()) setData(toList(result));
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

// ===========================================================================
// Certificate Backdrops
// ===========================================================================

/**
 * `GET /api/lms/certificates/backdrops` — list all backdrop images available
 * to the tenant (used by the template editor's "choose background" picker).
 */
export function useCertificateBackdrops(): UseLmsQueryResult<CertificateBackdrop[]> {
  const [data, setData] = useState<CertificateBackdrop[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.certificateBackdrop.list();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/certificates/backdrops` — register a new backdrop image.
 */
export function useCreateCertificateBackdrop(): UseLmsMutationResult<
  CertificateBackdrop,
  { name: string; imageUrl: string; orientation?: string }
> {
  const [data, setData] = useState<CertificateBackdrop | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      name: string;
      imageUrl: string;
      orientation?: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.certificateBackdrop.create(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `DELETE /api/lms/certificates/backdrops/{id}` — remove a backdrop. Pass the
 * `id` at `mutate(...)` time.
 */
export function useDeleteCertificateBackdrop(): UseLmsMutationResult<
  { success: boolean },
  string
> {
  const [data, setData] = useState<{ success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.certificateBackdrop.delete(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

// ===========================================================================
// Certificate Media (logos / signatures / watermarks / stamps)
// ===========================================================================

/**
 * `GET /api/lms/certificates/media` — list uploaded media assets, optionally
 * filtered by `mediaType` (`logo | signature | watermark | stamp`).
 */
export function useCertificateMedia(
  mediaType?: CertificateMediaType,
): UseLmsQueryResult<CertificateMedia[]> {
  const [data, setData] = useState<CertificateMedia[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.certificateMedia.list(mediaType);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [mediaType, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([mediaType])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/certificates/media` — upload/register a new media asset.
 */
export function useCreateCertificateMedia(): UseLmsMutationResult<
  CertificateMedia,
  { name: string; imageUrl: string; mediaType: CertificateMediaType }
> {
  const [data, setData] = useState<CertificateMedia | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      name: string;
      imageUrl: string;
      mediaType: CertificateMediaType;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.certificateMedia.create(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `DELETE /api/lms/certificates/media/{id}` — remove a media asset. Pass the
 * `id` at `mutate(...)` time.
 */
export function useDeleteCertificateMedia(): UseLmsMutationResult<
  { success: boolean },
  string
> {
  const [data, setData] = useState<{ success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.certificateMedia.delete(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

// ===========================================================================
// Certificate Templates (extended)
// ===========================================================================

/**
 * `GET /api/lms/certificates/templates` — list all certificate templates for
 * the tenant.
 */
export function useCertificateTemplates(): UseLmsQueryResult<CertificateTemplate[]> {
  const [data, setData] = useState<CertificateTemplate[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.certificate.getTemplates();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/certificates/templates/{id}` — fetch a single template.
 *
 * Skips the fetch while `id` is empty so it's safe to mount before the route
 * param is populated.
 */
export function useCertificateTemplate(
  id: string | undefined,
): UseLmsQueryResult<CertificateTemplate> {
  const [data, setData] = useState<CertificateTemplate | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.certificate.getTemplate(id);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [id, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([id])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/certificates/templates` — create a new certificate template.
 */
export function useCreateCertificateTemplate(): UseLmsMutationResult<
  CertificateTemplate,
  CertificateTemplateCreateInput
> {
  const [data, setData] = useState<CertificateTemplate | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: CertificateTemplateCreateInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.certificate.createTemplate(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `PATCH /api/lms/certificates/templates/{id}` — update a template. Pass
 * `{ id, input }` at `mutate(...)` time.
 */
export function useUpdateCertificateTemplate(): UseLmsMutationResult<
  CertificateTemplate,
  { id: string; input: CertificateTemplateCreateInput }
> {
  const [data, setData] = useState<CertificateTemplate | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      id: string;
      input: CertificateTemplateCreateInput;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.certificate.updateTemplate(
          vars.id,
          vars.input,
        );
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `DELETE /api/lms/certificates/templates/{id}` — remove a template. Pass the
 * `id` at `mutate(...)` time.
 */
export function useDeleteCertificateTemplate(): UseLmsMutationResult<
  { success: boolean },
  string
> {
  const [data, setData] = useState<{ success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.certificate.deleteTemplate(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `POST /api/lms/certificates/templates/{id}/duplicate` — clone an existing
 * template. Pass the `id` at `mutate(...)` time.
 */
export function useDuplicateCertificateTemplate(): UseLmsMutationResult<
  CertificateTemplate,
  string
> {
  const [data, setData] = useState<CertificateTemplate | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.certificate.duplicateTemplate(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `POST /api/lms/certificates/templates/{templateId}/preview` — render a
 * temporary preview of the template with sample (or supplied) data. Returns a
 * short-lived `previewUrl`.
 */
export function usePreviewCertificateTemplate(): UseLmsMutationResult<
  { previewUrl: string },
  CertificatePreviewInput
> {
  const [data, setData] = useState<{ previewUrl: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: CertificatePreviewInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.certificate.previewTemplate(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `POST /api/lms/certificates/assign` — bind a template to a course (and
 * optionally auto-issue certificates to existing completions).
 */
export function useAssignCertificateToCourse(): UseLmsMutationResult<
  { success: boolean },
  CertificateAssignInput
> {
  const [data, setData] = useState<{ success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: CertificateAssignInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.certificate.assignToCourse(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `GET /api/lms/certificates/{id}/download` — fetch the PDF download URL for
 * an issued certificate. Implemented as a mutation so the caller can trigger
 * it on demand (e.g. on a "Download PDF" click) without auto-running on mount.
 * Pass the certificate `id` at `mutate(...)` time.
 */
export function useDownloadCertificate(): UseLmsMutationResult<
  { pdfUrl: string },
  string
> {
  const [data, setData] = useState<{ pdfUrl: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.certificate.download(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `GET /api/lms/certificates/verify/{code}` — public verification lookup.
 *
 * Skips the fetch while `code` is empty so the verification page can mount
 * before the user has typed/entered anything.
 */
export function useVerifyCertificate(
  code: string | undefined,
): UseLmsQueryResult<{ valid: boolean; certificate?: Certificate }> {
  const [data, setData] = useState<{
    valid: boolean;
    certificate?: Certificate;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(code));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!code) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.certificate.verify(code);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [code, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([code])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/certificates/{id}/revoke` — revoke an issued certificate.
 * Pass `{ id, reason? }` at `mutate(...)` time so the same hook instance can
 * revoke any row in the issued-certificates table.
 */
export function useRevokeCertificate(): UseLmsMutationResult<
  Certificate,
  { id: string; reason?: string }
> {
  const [data, setData] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { id: string; reason?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.certificate.revoke(vars.id, vars.reason);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

// ===========================================================================
// Issued Certificates (list)
// ===========================================================================

/**
 * `GET /api/lms/certificates` — list issued certificates for the active
 * tenant. Accepts the standard `ListParams` (search / page / limit / sortBy /
 * sortDir) so admin/instructor pages can paginate and filter.
 */
export function useCertificates(
  params?: ListParams,
): UseLmsQueryResult<Certificate[]> {
  const [data, setData] = useState<Certificate[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.certificate.list(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

// ===========================================================================
// Content Drip
// ===========================================================================

/**
 * `GET /api/lms/courses/{courseId}/drip-rules` — list the drip rules that
 * gate lesson access for a course.
 */
export function useDripRules(
  courseId: string | undefined,
): UseLmsQueryResult<DripRule[]> {
  const [data, setData] = useState<DripRule[] | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(courseId));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!courseId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.dripRule.list(courseId);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [courseId, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([courseId])]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/drip-rules/{id}` — fetch a single drip rule.
 *
 * Skips the fetch while `id` is empty.
 */
export function useDripRule(
  id: string | undefined,
): UseLmsQueryResult<DripRule> {
  const [data, setData] = useState<DripRule | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.dripRule.get(id);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [id, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([id])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/drip-rules` — create a new drip rule.
 */
export function useCreateDripRule(): UseLmsMutationResult<
  DripRule,
  DripRuleCreateInput
> {
  const [data, setData] = useState<DripRule | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: DripRuleCreateInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.dripRule.create(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `PATCH /api/lms/drip-rules/{id}` — update a drip rule. Pass
 * `{ id, input }` at `mutate(...)` time.
 */
export function useUpdateDripRule(): UseLmsMutationResult<
  DripRule,
  { id: string; input: Partial<DripRuleCreateInput> }
> {
  const [data, setData] = useState<DripRule | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { id: string; input: Partial<DripRuleCreateInput> }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.dripRule.update(vars.id, vars.input);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `DELETE /api/lms/drip-rules/{id}` — remove a drip rule. Pass the `id` at
 * `mutate(...)` time.
 */
export function useDeleteDripRule(): UseLmsMutationResult<
  { success: boolean },
  string
> {
  const [data, setData] = useState<{ success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.dripRule.delete(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `GET /api/lms/lessons/{lessonId}/drip-check` — runtime access check for the
 * current user against a single lesson. Returns `{ hasAccess, reason?,
 * unlockAt? }` so the player UI can render a "unlocks in N days" / "complete
 * the previous lesson first" gate.
 *
 * Skips the fetch while `lessonId` is empty.
 */
export function useCheckDripAccess(
  lessonId: string | undefined,
): UseLmsQueryResult<{
  hasAccess: boolean;
  reason?: string;
  unlockAt?: string;
}> {
  const [data, setData] = useState<{
    hasAccess: boolean;
    reason?: string;
    unlockAt?: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(lessonId));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!lessonId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.dripRule.checkAccess(lessonId);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [lessonId, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([lessonId])]);

  return { data, loading, error, refetch: run };
}

// ===========================================================================
// Prerequisite Chains
// ===========================================================================

/**
 * `GET /api/lms/courses/{courseId}/prerequisites` — list the prerequisite
 * courses that gate enrollment for a course.
 */
export function usePrerequisites(
  courseId: string | undefined,
): UseLmsQueryResult<PrerequisiteChain[]> {
  const [data, setData] = useState<PrerequisiteChain[] | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(courseId));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!courseId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.prerequisite.list(courseId);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [courseId, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([courseId])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/prerequisites` — add a prerequisite course to a course's
 * chain.
 */
export function useCreatePrerequisite(): UseLmsMutationResult<
  PrerequisiteChain,
  PrerequisiteChainCreateInput
> {
  const [data, setData] = useState<PrerequisiteChain | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: PrerequisiteChainCreateInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.prerequisite.create(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `DELETE /api/lms/prerequisites/{id}` — remove a prerequisite link. Pass the
 * `id` at `mutate(...)` time.
 */
export function useDeletePrerequisite(): UseLmsMutationResult<
  { success: boolean },
  string
> {
  const [data, setData] = useState<{ success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.prerequisite.delete(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `GET /api/lms/courses/{courseId}/prerequisite-check` — eligibility probe for
 * the current user. Returns `{ eligible, missingPrerequisites }` so the
 * storefront / checkout UI can show "complete X first" prompts.
 *
 * Skips the fetch while `courseId` is empty.
 */
export function useCheckPrerequisiteEligibility(
  courseId: string | undefined,
): UseLmsQueryResult<{
  eligible: boolean;
  missingPrerequisites: string[];
}> {
  const [data, setData] = useState<{
    eligible: boolean;
    missingPrerequisites: string[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(courseId));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!courseId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.prerequisite.checkEligibility(courseId);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [courseId, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([courseId])]);

  return { data, loading, error, refetch: run };
}

// ===========================================================================
// Course Instructors (multi-instructor)
// ===========================================================================

/**
 * `GET /api/lms/courses/{courseId}/instructors` — list the instructors
 * assigned to a course along with their revenue-share split.
 */
export function useCourseInstructors(
  courseId: string | undefined,
): UseLmsQueryResult<CourseInstructor[]> {
  const [data, setData] = useState<CourseInstructor[] | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(courseId));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!courseId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.courseInstructor.list(courseId);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [courseId, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([courseId])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/course-instructors` — add an instructor to a course.
 */
export function useAddCourseInstructor(): UseLmsMutationResult<
  CourseInstructor,
  CourseInstructorCreateInput
> {
  const [data, setData] = useState<CourseInstructor | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: CourseInstructorCreateInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.courseInstructor.add(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `PATCH /api/lms/course-instructors/{id}` — update an instructor's role /
 * revenue share / primary flag. Pass `{ id, input }` at `mutate(...)` time.
 */
export function useUpdateCourseInstructor(): UseLmsMutationResult<
  CourseInstructor,
  { id: string; input: Partial<CourseInstructorCreateInput> }
> {
  const [data, setData] = useState<CourseInstructor | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      id: string;
      input: Partial<CourseInstructorCreateInput>;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.courseInstructor.update(
          vars.id,
          vars.input,
        );
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `DELETE /api/lms/course-instructors/{id}` — remove an instructor from a
 * course. Pass the `id` at `mutate(...)` time.
 */
export function useRemoveCourseInstructor(): UseLmsMutationResult<
  { success: boolean },
  string
> {
  const [data, setData] = useState<{ success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.courseInstructor.remove(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

// ===========================================================================
// Assignment Grades
// ===========================================================================

/**
 * `GET /api/lms/assignment-submissions/{submissionId}/grade` — fetch the
 * grade (if any) attached to a submission.
 *
 * Skips the fetch while `submissionId` is empty.
 */
export function useAssignmentGrade(
  submissionId: string | undefined,
): UseLmsQueryResult<AssignmentGrade> {
  const [data, setData] = useState<AssignmentGrade | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(submissionId));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!submissionId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.assignmentGrade.get(submissionId);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [submissionId, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([submissionId])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/assignment-submissions/{submissionId}/grade` — record a
 * grade against a submission. Pass `{ submissionId, input }` at
 * `mutate(...)` time so the same hook instance can grade any row in the
 * submissions table.
 */
export function useCreateAssignmentGrade(): UseLmsMutationResult<
  AssignmentGrade,
  { submissionId: string; input: AssignmentGradeInput }
> {
  const [data, setData] = useState<AssignmentGrade | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      submissionId: string;
      input: AssignmentGradeInput;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.assignmentGrade.create(
          vars.submissionId,
          vars.input,
        );
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `PATCH /api/lms/assignment-grades/{gradeId}` — adjust an existing grade
 * (e.g. re-grade after an appeal). Pass `{ gradeId, input }` at
 * `mutate(...)` time.
 */
export function useUpdateAssignmentGrade(): UseLmsMutationResult<
  AssignmentGrade,
  { gradeId: string; input: Partial<AssignmentGradeInput> }
> {
  const [data, setData] = useState<AssignmentGrade | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      gradeId: string;
      input: Partial<AssignmentGradeInput>;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.assignmentGrade.update(
          vars.gradeId,
          vars.input,
        );
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

// ===========================================================================
// Assignments + Submissions (extended read paths for the grading studio)
// ===========================================================================

/**
 * `GET /api/lms/assignments` — list assignments, optionally filtered by
 * `courseId` / `topicId` / `status` via `AssignmentListParams`.
 */
export function useAssignments(
  params?: AssignmentListParams,
): UseLmsQueryResult<Assignment[]> {
  const [data, setData] = useState<Assignment[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.assignmentExtended.list(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/assignments/{id}` — fetch a single assignment.
 *
 * Skips the fetch while `id` is empty.
 */
export function useAssignment(
  id: string | undefined,
): UseLmsQueryResult<Assignment> {
  const [data, setData] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.assignmentExtended.get(id);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [id, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([id])]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/assignments/{assignmentId}/submissions` — list submissions for
 * an assignment, paginated via the standard `ListParams`.
 *
 * Skips the fetch while `assignmentId` is empty.
 */
export function useAssignmentSubmissions(
  assignmentId: string | undefined,
  params?: ListParams,
): UseLmsQueryResult<AssignmentSubmission[]> {
  const [data, setData] = useState<AssignmentSubmission[] | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(assignmentId));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!assignmentId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.assignmentExtended.listSubmissions(
        assignmentId,
        params,
      );
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [assignmentId, params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([assignmentId, params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/assignment-submissions/{id}` — fetch a single submission with
 * its attachments and student info.
 *
 * Skips the fetch while `id` is empty.
 */
export function useAssignmentSubmission(
  id: string | undefined,
): UseLmsQueryResult<AssignmentSubmission> {
  const [data, setData] = useState<AssignmentSubmission | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.assignmentExtended.getSubmission(id);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [id, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([id])]);

  return { data, loading, error, refetch: run };
}
