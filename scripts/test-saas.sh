#!/bin/bash
# Start backend, wait, test auth, show results — all in one session
export PATH="/home/z/go/go/bin:$PATH"

# Kill any existing
pkill -f lastsaas-final 2>/dev/null; sleep 2

cd /home/z/my-project/repos/lastsaas/backend

echo "=== Starting backend ==="
setsid env LASTSAAS_ENV=dev /tmp/lastsaas-final > /tmp/backend-test.log 2>&1 &
BACKEND_PID=$!
disown

echo "Backend PID: $BACKEND_PID"
echo "Waiting for backend to be ready (up to 80s)..."

for i in $(seq 1 16); do
  sleep 5
  if curl -s http://localhost:4290/health 2>/dev/null | grep -q "ok"; then
    echo "✅ Backend ready after $((i*5))s!"
    break
  fi
  echo "  ${i}x5=$((i*5))s..."
done

echo ""
echo "=========================================="
echo "TESTING THE ACTUAL SaaS"
echo "=========================================="

echo ""
echo "1. Health check:"
curl -s http://localhost:4290/health
echo ""

echo ""
echo "2. Bootstrap status:"
curl -s http://localhost:4290/api/bootstrap/status
echo ""

echo ""
echo "3. Login as admin (admin@kayanacademy.com):"
LOGIN=$(curl -s -X POST http://localhost:4290/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kayanacademy.com","password":"SecurePass123!"}')
echo "$LOGIN" | python3 -m json.tool 2>/dev/null || echo "$LOGIN"

echo ""
echo "4. Sign up a NEW school (Test Academy):"
SIGNUP=$(curl -s -X POST http://localhost:4290/api/auth/school-signup \
  -H "Content-Type: application/json" \
  -d '{"schoolName":"Test Academy","fullName":"John Test","email":"john@test.com","password":"TestPass123!"}')
echo "$SIGNUP" | python3 -m json.tool 2>/dev/null || echo "$SIGNUP"

echo ""
echo "5. Login as the new school owner:"
LOGIN2=$(curl -s -X POST http://localhost:4290/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@test.com","password":"TestPass123!"}')
echo "$LOGIN2" | python3 -m json.tool 2>/dev/null || echo "$LOGIN2"

echo ""
echo "6. Get tenants for john@test.com:"
curl -s "http://localhost:4290/api/auth/tenants?email=john@test.com" | python3 -m json.tool 2>/dev/null

echo ""
echo "7. LMS API - list courses:"
curl -s http://localhost:4290/api/lms/courses | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Courses found: {len(d.get(\"courses\",[]))}')" 2>/dev/null

echo ""
echo "8. LMS API - list badges:"
curl -s http://localhost:4290/api/lms/badges | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Badges found: {len(d.get(\"badges\",[]))}')" 2>/dev/null

echo ""
echo "9. LMS API - email templates:"
curl -s http://localhost:4290/api/lms/email-templates | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Templates found: {len(d.get(\"templates\",d) if isinstance(d,dict) else d)}')" 2>/dev/null

echo ""
echo "10. LMS API - certificates:"
curl -s http://localhost:4290/api/lms/certificates/templates | head -c 200

echo ""
echo ""
echo "=========================================="
echo "BACKEND LOG (last 10 lines)"
echo "=========================================="
tail -10 /tmp/backend-test.log

echo ""
echo "=========================================="
echo "SERVICES STATUS"
echo "=========================================="
echo "Go backend (4290):     $(curl -s -o /dev/null -w '%{http_code}' http://localhost:4290/health 2>/dev/null)"
echo "Tailux frontend (5173): $(curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/ 2>/dev/null)"
echo "Next.js proxy (3000):   $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null)"

# Keep the backend running
echo ""
echo "Backend is still running at PID $BACKEND_PID"
echo "To stop it: kill $BACKEND_PID"
