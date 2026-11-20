#!/usr/bin/env bash
# Checks messaging between a student and an employer (server must be running).
# Run "npm run migrate" first, because this module adds a migration.
# Usage: bash test-messages.sh   (ADMIN_PASSWORD=... if you changed the admin password)
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
export OTHER="hr2$(date +%s)@acme.test"

echo "1. Set up: two verified employers, an open internship, a student who applies"
ADMIN=$(api POST /auth/login "" '{"email":"admin@school.edu","password":"'"${ADMIN_PASSWORD:-ChangeMe123!}"'"}' | json 'd.token')
[ -z "$ADMIN" ] || [ "$ADMIN" = "undefined" ] && { echo "Admin login failed. Run: ADMIN_PASSWORD=yourpassword bash test-messages.sh"; exit 1; }
EMP=$(api POST /auth/register "" "{\"role\":\"employer\",\"email\":\"$EMAIL\",\"password\":\"password123\",\"companyName\":\"Acme Software\"}" | json 'd.token')
OTHER_EMP=$(api POST /auth/register "" "{\"role\":\"employer\",\"email\":\"$OTHER\",\"password\":\"password123\",\"companyName\":\"Other Co\"}" | json 'd.token')
PENDING=$(api GET "/admin/employers?status=pending" "$ADMIN")
for E in "$EMAIL" "$OTHER"; do
  ID=$(echo "$PENDING" | E="$E" json 'd.find(e => e.email === process.env.E).employerId')
  api POST "/admin/employers/$ID/verify" "$ADMIN" > /dev/null
done
OID=$(api POST /opportunities "$EMP" '{"type":"internship","title":"Backend Intern","slots":1,"deadline":"2027-12-31T00:00:00Z"}' | json 'd.opportunityId')
api POST "/opportunities/$OID/submit" "$EMP" > /dev/null
api POST "/opportunities/$OID/approve" "$ADMIN" > /dev/null
api POST /auth/register "" '{"role":"student","email":"ana@school.edu","password":"password123","firstName":"Ana","lastName":"Cruz","studentNumber":"2024-0001","programId":1,"yearLevel":3}' > /dev/null
STU=$(api POST /auth/login "" '{"email":"ana@school.edu","password":"password123"}' | json 'd.token')
AID=$(api POST /applications "$STU" "{\"opportunityId\":$OID}" | json 'd.applicationId')
echo "   application $AID"

echo "2. Employer writes to the student"
api POST /messages "$EMP" "{\"applicationId\":$AID,\"body\":\"Hi Ana, thanks for applying. Are you free this week?\"}" | json '"   sent message " + d.messageId'

echo "3. Student's unread count and inbox"
api GET /messages/unread-count "$STU" | json '"   unread: " + d.unread'
api GET /messages/inbox "$STU" | json 'd.map(c => "   " + c.companyName + " / " + c.opportunityTitle + ": \"" + c.lastBody + "\" (unread " + c.unread + ")").join("\n")'

echo "4. A second employer message does not add a second notification"
api POST /messages "$EMP" "{\"applicationId\":$AID,\"body\":\"Also, please send your portfolio link.\"}" > /dev/null
api GET /notifications "$STU" | json '"   message notifications: " + d.filter(n => n.type === "message" && !n.isRead).length'

echo "5. Student opens the thread (this marks it read) and replies"
api GET "/messages?applicationId=$AID" "$STU" | json 'd.messages.map(m => "   " + (m.senderId === d.messages[0].senderId ? "employer" : "student ") + ": " + m.body).join("\n")'
api GET /messages/unread-count "$STU" | json '"   unread now: " + d.unread'
api POST /messages "$STU" "{\"applicationId\":$AID,\"body\":\"Yes, Thursday afternoon works.\"}" | json '"   sent message " + d.messageId'

echo "6. Employer sees the reply"
api GET /messages/unread-count "$EMP" | json '"   employer unread: " + d.unread'

echo "7. Paging: only the latest 2 messages, then older ones"
api GET "/messages?applicationId=$AID&limit=2" "$EMP" | json '"   got " + d.messages.length + " messages, hasMore: " + d.hasMore'

echo "8. Another employer cannot read or write the thread (expect 404)"
api GET "/messages?applicationId=$AID" "$OTHER_EMP" | show
api POST /messages "$OTHER_EMP" "{\"applicationId\":$AID,\"body\":\"Hello?\"}" | show

echo "9. An empty message is refused (expect 400)"
api POST /messages "$STU" "{\"applicationId\":$AID,\"body\":\"   \"}" | show

echo "10. Admin cannot use messaging (expect 403)"
api GET /messages/inbox "$ADMIN" | show
