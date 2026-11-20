#!/usr/bin/env bash
# Checks the student profile and skills endpoints (server must be running).
# Usage: bash test-students.sh
BASE=${BASE:-http://localhost:4000/api}

json() { node -pe "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); $1"; }
show() { json 'JSON.stringify(d,null,2)'; }
api() { # api METHOD PATH [TOKEN] [JSON_BODY]
  local args=(-s -X "$1" "$BASE$2" -H "Content-Type: application/json")
  [ -n "$3" ] && args+=(-H "Authorization: Bearer $3")
  [ -n "$4" ] && args+=(-d "$4")
  curl "${args[@]}"
}

api POST /auth/register "" '{"role":"student","email":"ana@school.edu","password":"password123","firstName":"Ana","lastName":"Cruz","studentNumber":"2024-0001","programId":1,"yearLevel":3}' > /dev/null
STU=$(api POST /auth/login "" '{"email":"ana@school.edu","password":"password123"}' | json 'd.token')
[ -z "$STU" ] || [ "$STU" = "undefined" ] && { echo "Student login failed"; exit 1; }

echo "1. Public lists for dropdowns"
api GET /lookups/programs | json 'd.length + " programs, first: " + d[0].programName'
api GET /lookups/skills | json 'd.length + " skills, first: " + d[0].skillName'

echo "2. My profile"
api GET /students/me "$STU" | show

echo "3. Update year level and availability"
api PATCH /students/me "$STU" '{"yearLevel":4,"availability":"2027-01-15"}' | json '"year " + d.yearLevel + ", available " + d.availability'

echo "4. Set skills (ids 1, 2, 3)"
api PUT /students/me/skills "$STU" '{"skillIds":[1,2,3]}' | json 'd.skills.map(s => s.skillName).join(", ") + " -> " + d.profileCompleteness.percent + "% complete"'

echo "5. Replace skills with just id 1"
api PUT /students/me/skills "$STU" '{"skillIds":[1]}' | json 'd.skills.length + " skill left"'

echo "6. A skill that does not exist is refused (expect 400)"
api PUT /students/me/skills "$STU" '{"skillIds":[999999]}' | show

echo "7. An unknown program is refused (expect 400)"
api PATCH /students/me "$STU" '{"programId":999999}' | show

echo "8. An empty update is refused (expect 400)"
api PATCH /students/me "$STU" '{}' | show

echo "9. Clear availability"
api PATCH /students/me "$STU" '{"availability":null}' | json '"availability: " + d.availability + ", missing: " + d.profileCompleteness.missing.join("; ")'

echo "10. Without a token (expect 401)"
api GET /students/me | show
