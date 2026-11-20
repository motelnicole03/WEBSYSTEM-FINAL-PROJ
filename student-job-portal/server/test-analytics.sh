#!/usr/bin/env bash
# Checks the analytics endpoints (server must be running). Run test-applications.sh first so there is data.
# Usage: bash test-analytics.sh
BASE=${BASE:-http://localhost:4000/api}

json() { node -pe "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); $1"; }
show() { json 'JSON.stringify(d,null,2)'; }
api() { # api METHOD PATH [TOKEN]
  local args=(-s -X "$1" "$BASE$2")
  [ -n "$3" ] && args+=(-H "Authorization: Bearer $3")
  curl "${args[@]}"
}

ADMIN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@school.edu","password":"'"${ADMIN_PASSWORD:-ChangeMe123!}"'"}' | json 'd.token')
[ -z "$ADMIN" ] || [ "$ADMIN" = "undefined" ] && { echo "Admin login failed. Run: ADMIN_PASSWORD=yourpassword bash test-analytics.sh"; exit 1; }
STU=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"ana@school.edu","password":"password123"}' | json 'd.token')

echo "1. A public search is recorded (shows up in top searches)"
api GET "/opportunities?q=backend" > /dev/null; sleep 1

echo "2. Admin overview (last 90 days)"
api GET /analytics/admin/overview "$ADMIN" | show

echo "3. Admin trends by month"
api GET "/analytics/admin/trends?interval=month" "$ADMIN" | show

echo "4. Admin breakdowns"
api GET /analytics/admin/breakdowns "$ADMIN" | show

echo "5. CSV report (first lines)"
curl -s "$BASE/analytics/admin/reports/applications" -H "Authorization: Bearer $ADMIN" | head -5

echo "6. Bad date is refused (expect 400)"
api GET "/analytics/admin/overview?from=yesterday" "$ADMIN" | show

echo "7. Student dashboard"
api GET /analytics/student/overview "$STU" | show

echo "8. A student cannot open the admin dashboard (expect 403)"
api GET /analytics/admin/overview "$STU" | show
