#!/usr/bin/env bash
# Walks through scheduling, confirming, rescheduling and cancelling interviews (server must be running).
# Run "npm run migrate" first, because this module adds a migration.
# Usage: bash test-interviews.sh   (ADMIN_PASSWORD=... if you changed the admin password)
BASE=${BASE:-http://localhost:4000/api}

json() { node -pe "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); $1"; }
show() { json 'JSON.stringify(d,null,2)'; }
api() { # api METHOD PATH [TOKEN] [JSON_BODY]
  local args=(-s -X "$1" "$BASE$2" -H "Content-Type: application/json")
  [ -n "$3" ] && args+=(-H "Authorization: Bearer $3")
  [ -n "$4" ] && args+=(-d "$4")
  curl "${args[@]}"
}
future() { node -pe "new Date(Date.now() + $1 * 86400000).toISOString()"; }

export EMAIL="hr$(date +%s)@acme.test"

echo "1. Set up: verified employer, open internship, student applies, employer shortlists"
ADMIN=$(api POST /auth/login "" '{"email":"admin@school.edu","password":"'"${ADMIN_PASSWORD:-ChangeMe123!}"'"}' | json 'd.token')
[ -z "$ADMIN" ] || [ "$ADMIN" = "undefined" ] && { echo "Admin login failed. Run: ADMIN_PASSWORD=yourpassword bash test-interviews.sh"; exit 1; }
EMP=$(api POST /auth/register "" "{\"role\":\"employer\",\"email\":\"$EMAIL\",\"password\":\"password123\",\"companyName\":\"Acme Software\"}" | json 'd.token')
EID=$(api GET "/admin/employers?status=pending" "$ADMIN" | json 'd.find(e => e.email === process.env.EMAIL).employerId')
api POST "/admin/employers/$EID/verify" "$ADMIN" > /dev/null
OID=$(api POST /opportunities "$EMP" '{"type":"internship","title":"Backend Intern","slots":1,"deadline":"2027-12-31T00:00:00Z"}' | json 'd.opportunityId')
api POST "/opportunities/$OID/submit" "$EMP" > /dev/null
api POST "/opportunities/$OID/approve" "$ADMIN" > /dev/null
api POST /auth/register "" '{"role":"student","email":"ana@school.edu","password":"password123","firstName":"Ana","lastName":"Cruz","studentNumber":"2024-0001","programId":1,"yearLevel":3}' > /dev/null
STU=$(api POST /auth/login "" '{"email":"ana@school.edu","password":"password123"}' | json 'd.token')
AID=$(api POST /applications "$STU" "{\"opportunityId\":$OID}" | json 'd.applicationId')
echo "   application $AID"

echo "2. Scheduling before the application is shortlisted is refused (expect 409)"
api POST /interviews "$EMP" "{\"applicationId\":$AID,\"schedule\":\"$(future 3)\",\"mode\":\"online\",\"linkOrVenue\":\"https://meet.example.com/abc\"}" | show
api PATCH "/applications/$AID/status" "$EMP" '{"status":"under_review"}' > /dev/null
api PATCH "/applications/$AID/status" "$EMP" '{"status":"shortlisted"}' > /dev/null

echo "3. A time in the past is refused (expect 400)"
api POST /interviews "$EMP" "{\"applicationId\":$AID,\"schedule\":\"2020-01-01T09:00:00Z\",\"mode\":\"phone\"}" | show

echo "4. An online interview without a link is refused (expect 400)"
api POST /interviews "$EMP" "{\"applicationId\":$AID,\"schedule\":\"$(future 3)\",\"mode\":\"online\"}" | show

echo "5. Employer schedules it (the application moves to the interview stage)"
IID=$(api POST /interviews "$EMP" "{\"applicationId\":$AID,\"schedule\":\"$(future 3)\",\"mode\":\"online\",\"linkOrVenue\":\"https://meet.example.com/abc\"}" | json 'd.interviewId')
api GET "/interviews/$IID" "$STU" | json '"   interview " + d.interviewId + ": " + d.mode + ", response " + d.studentResponse + ", application " + d.applicationStatus'

echo "6. Only employers can reschedule (admin gets 403)"
api PATCH "/interviews/$IID" "$ADMIN" '{"mode":"phone"}' | show

echo "7. Student confirms"
api POST "/interviews/$IID/respond" "$STU" '{"response":"confirmed"}' | json '"   response: " + d.studentResponse'

echo "8. Employer reschedules (the student must confirm again)"
api PATCH "/interviews/$IID" "$EMP" "{\"schedule\":\"$(future 5)\"}" | json '"   response is now: " + d.studentResponse'

echo "9. Student's upcoming interviews"
api GET "/interviews?upcoming=true" "$STU" | json 'd.map(i => "   " + i.opportunityTitle + " at " + i.companyName + " - " + i.schedule).join("\n")'

echo "10. Marking it passed before it happens is refused (expect 409)"
api POST "/interviews/$IID/result" "$EMP" '{"result":"passed"}' | show

echo "11. Employer cancels"
api POST "/interviews/$IID/result" "$EMP" '{"result":"cancelled"}' | json '"   result: " + d.result'
echo "   A cancelled interview cannot be changed again (expect 409):"
api POST "/interviews/$IID/respond" "$STU" '{"response":"confirmed"}' | show

echo "12. Notifications"
echo "   student:"; api GET /notifications "$STU" | json 'd.slice(0,3).map(n => "   - " + n.message).join("\n")'
echo "   employer:"; api GET /notifications "$EMP" | json 'd.slice(0,3).map(n => "   - " + n.message).join("\n")'
