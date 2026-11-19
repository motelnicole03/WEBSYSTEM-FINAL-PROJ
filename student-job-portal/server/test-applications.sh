#!/usr/bin/env bash
# Walks through resumes, applying, the status flow and notifications (server must be running).
# Usage: bash test-applications.sh
BASE=${BASE:-http://localhost:4000/api}

json() { node -pe "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); $1"; }
show() { json 'JSON.stringify(d,null,2)'; }
api() { # api METHOD PATH [TOKEN] [JSON_BODY]
  local args=(-s -X "$1" "$BASE$2" -H "Content-Type: application/json")
  [ -n "$3" ] && args+=(-H "Authorization: Bearer $3")
  [ -n "$4" ] && args+=(-d "$4")
  curl "${args[@]}"
}

export EMAIL="hr$(date +%s)@acme.test"

echo "1. Set up: admin, a verified employer, and an open internship"
ADMIN=$(api POST /auth/login "" '{"email":"admin@school.edu","password":"ChangeMe123!"}' | json 'd.token')
[ -z "$ADMIN" ] || [ "$ADMIN" = "undefined" ] && { echo "Admin login failed. Check ADMIN_PASSWORD in .env"; exit 1; }
EMP=$(api POST /auth/register "" "{\"role\":\"employer\",\"email\":\"$EMAIL\",\"password\":\"password123\",\"companyName\":\"Acme Software\"}" | json 'd.token')
EID=$(api GET "/admin/employers?status=pending" "$ADMIN" | json 'd.find(e => e.email === process.env.EMAIL).employerId')
api POST "/admin/employers/$EID/verify" "$ADMIN" > /dev/null
OID=$(api POST /opportunities "$EMP" '{"type":"internship","title":"Backend Intern","slots":1,"deadline":"2027-12-31T00:00:00Z"}' | json 'd.opportunityId')
api POST "/opportunities/$OID/submit" "$EMP" > /dev/null
api POST "/opportunities/$OID/approve" "$ADMIN" | json '"   opportunity " + d.opportunityId + " is " + d.status'

echo "2. Student logs in (registers first if needed) and uploads a resume"
api POST /auth/register "" '{"role":"student","email":"ana@school.edu","password":"password123","firstName":"Ana","lastName":"Cruz","studentNumber":"2024-0001","programId":1,"yearLevel":3}' > /dev/null
STU=$(api POST /auth/login "" '{"email":"ana@school.edu","password":"password123"}' | json 'd.token')
PDF="$(mktemp).pdf"; printf '%%PDF-1.4\n%%%%EOF\n' > "$PDF"
curl -s -X POST "$BASE/resumes" -H "Authorization: Bearer $STU" \
  -F "file=@$PDF;type=application/pdf;filename=ana-resume.pdf" -F isDefault=true | show

echo "3. A fake file is refused (text pretending to be a PDF)"
echo "not really a pdf" > "$PDF"
curl -s -X POST "$BASE/resumes" -H "Authorization: Bearer $STU" \
  -F "file=@$PDF;type=application/pdf;filename=fake.pdf" | show

echo "4. Student applies (the default resume is attached automatically)"
APP=$(api POST /applications "$STU" "{\"opportunityId\":$OID,\"coverLetter\":\"I would love to join your team.\"}")
AID=$(echo "$APP" | json 'd.applicationId')
echo "$APP" | show

echo "5. Applying twice is refused"
api POST /applications "$STU" "{\"opportunityId\":$OID}" | show

echo "6. Employer sees the applicant"
api GET "/applications/opportunity/$OID" "$EMP" | show

echo "7. Skipping a step is refused (submitted -> offered)"
api PATCH "/applications/$AID/status" "$EMP" '{"status":"offered"}' | show

echo "8. Employer moves it through the flow"
for S in under_review shortlisted interview offered; do
  api PATCH "/applications/$AID/status" "$EMP" "{\"status\":\"$S\",\"remarks\":\"moved to $S\"}" | json '"   now " + d.currentStatus'
done

echo "9. Student's notifications"
api GET /notifications "$STU" | json 'd.map(n => "   " + n.message).join("\n")'

echo "10. Student accepts the offer, so the single slot is filled"
api POST "/applications/$AID/accept" "$STU" | json '"   application: " + d.currentStatus'
api GET "/opportunities/$OID" "$EMP" | json '"   opportunity: " + d.status'

echo "11. Status history"
api GET "/applications/$AID" "$STU" | json 'd.history.map(h => "   " + h.status + " by " + h.changedByRole + (h.remarks ? " (" + h.remarks + ")" : "")).join("\n")'

echo "12. Employer downloads the resume"
FID=$(api GET "/applications/$AID" "$EMP" | json 'd.files[0].fileId')
curl -s -o /dev/null -w "   HTTP %{http_code}, %{size_download} bytes\n" -H "Authorization: Bearer $EMP" "$BASE/applications/$AID/files/$FID"

echo "13. Employer's unread notifications"
api GET /notifications/unread-count "$EMP"; echo
