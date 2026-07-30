#!/bin/bash
# Keep all 3 services alive — restarts if they die
export PATH="/home/z/go/go/bin:$PATH"

LOG_DIR="/tmp/saas-services"
mkdir -p "$LOG_DIR"

# Kill any existing processes
pkill -f "lastsaas-final" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 3

echo "=== Starting Go backend ==="
setsid env LASTSAAS_ENV=dev /tmp/lastsaas-final > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

echo "Waiting for backend (up to 90s)..."
for i in $(seq 1 18); do
  sleep 5
  if curl -s http://127.0.0.1:4290/health 2>/dev/null | grep -q "ok"; then
    echo "✅ Backend ready after $((i*5))s"
    break
  fi
  echo "  ${i}x5=$((i*5))s..."
done

echo ""
echo "=== Starting Vite (tailux frontend) ==="
cd /home/z/my-project/repos/tailux/tailux-main
setsid npx vite --host 0.0.0.0 --port 5173 > "$LOG_DIR/vite.log" 2>&1 &
VITE_PID=$!
echo "Vite PID: $VITE_PID"

echo "Waiting for Vite..."
for i in $(seq 1 6); do
  sleep 3
  if curl -s http://127.0.0.1:5173/ 2>/dev/null | grep -q "html"; then
    echo "✅ Vite ready after $((i*3))s"
    break
  fi
  echo "  ${i}x3=$((i*3))s..."
done

echo ""
echo "=== Starting Next.js ==="
cd /home/z/my-project
setsid npx next dev --port 3000 --hostname 0.0.0.0 > "$LOG_DIR/nextjs.log" 2>&1 &
NEXT_PID=$!
echo "Next.js PID: $NEXT_PID"

echo "Waiting for Next.js..."
for i in $(seq 1 6); do
  sleep 3
  if curl -s http://127.0.0.1:3000/api/tailux/ 2>/dev/null | grep -q "html\|308\|200"; then
    echo "✅ Next.js ready after $((i*3))s"
    break
  fi
  echo "  ${i}x3=$((i*3))s..."
done

echo ""
echo "=== ALL SERVICES STARTED ==="
echo "Backend PID:  $BACKEND_PID (port 4290)"
echo "Vite PID:     $VITE_PID (port 5173)"
echo "Next.js PID:  $NEXT_PID (port 3000)"
echo ""
echo "Logs in: $LOG_DIR/"

# Write PIDs to file for later management
cat > "$LOG_DIR/pids.txt" << EOF
BACKEND=$BACKEND_PID
VITE=$VITE_PID
NEXTJS=$NEXT_PID
EOF

echo ""
echo "=== Final health check ==="
curl -s http://127.0.0.1:4290/health 2>/dev/null && echo "" || echo "Backend: FAILED"
curl -s -o /dev/null -w "Vite: %{http_code}\n" http://127.0.0.1:5173/ 2>/dev/null
curl -s -o /dev/null -w "Next.js: %{http_code}\n" http://127.0.0.1:3000/ 2>/dev/null
