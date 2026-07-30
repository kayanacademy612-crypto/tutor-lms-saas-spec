#!/bin/bash
# Backend watchdog — restarts the Go backend if it dies
export PATH="/home/z/go/go/bin:$PATH"

LOG_FILE="/tmp/saas-backend-watchdog.log"
PID_FILE="/tmp/saas-backend.pid"

# Kill any existing backend
pkill -f "lastsaas-final" 2>/dev/null
sleep 2

while true; do
  echo "$(date): Starting backend..." >> "$LOG_FILE"
  
  cd /home/z/my-project/repos/lastsaas/backend
  setsid env LASTSAAS_ENV=dev /tmp/lastsaas-final >> "$LOG_FILE" 2>&1 &
  BACKEND_PID=$!
  echo "$BACKEND_PID" > "$PID_FILE"
  disown -a
  
  # Wait for it to be ready (up to 90s)
  READY=0
  for i in $(seq 1 18); do
    sleep 5
    if curl -s http://127.0.0.1:4290/health 2>/dev/null | grep -q "ok"; then
      echo "$(date): Backend ready after $((i*5))s (PID $BACKEND_PID)" >> "$LOG_FILE"
      READY=1
      break
    fi
  done
  
  if [ $READY -eq 0 ]; then
    echo "$(date): Backend failed to start, retrying in 10s..." >> "$LOG_FILE"
    sleep 10
    continue
  fi
  
  # Reset rate limits on each restart
  cd /home/z/my-project/repos/lastsaas/backend
  go run ./cmd/reset-rl/ >> "$LOG_FILE" 2>&1
  
  # Monitor — if backend dies, restart it
  while true; do
    sleep 10
    if ! curl -s http://127.0.0.1:4290/health 2>/dev/null | grep -q "ok"; then
      echo "$(date): Backend died! Restarting..." >> "$LOG_FILE"
      pkill -f "lastsaas-final" 2>/dev/null
      sleep 5
      break
    fi
  done
done
