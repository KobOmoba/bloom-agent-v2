# EduBloom Suite — Full Data Architecture Blueprint
*Version 1.0 | AariNAT Company Limited | Abeokuta*

---

## DESIGN PRINCIPLES
1. Firebase Firestore now → Supabase self-hosted at 200 schools → Own server at Stage 2
2. Every collection is schema-stable — fields don't change, only grow
3. Every record carries schoolId — so data is always isolated per school
4. Timestamps are always stored — they become AI training signals later
5. Every student interaction is a data point for the Unified Vector Lake

---

## COLLECTION MAP

### 1. `schools`
The master record for every school on the platform.

```
schoolId          string  (e.g. "EDB-LG-0042") — auto-generated on approval
schoolName        string
state             string
lga               string
address           string
principalName     string
principalPhone    string
principalEmail    string
config: {
  password        string  — school login password
  plan            string  — "basic" | "premium"
  tier            string  — tier name
  tierMax         number  — max students for current tier
  tierPrice       number
  studentCount    number  — live count, updated on student add/remove
  currentTerm     string  — "Term 1" | "Term 2" | "Term 3"
  currentSession  string  — e.g. "2025/2026"
  termsPaid       number
  tierExceededAt  timestamp | null
  examGuarantee   boolean — v2: is exam pass guarantee active?
}
createdAt         timestamp
approvedAt        timestamp
approvedBy        string  — admin uid
agentId           string  — ref to admin_agents
agentName         string
```

---

### 2. `students`
One document per student. Nested under their school.

```
studentId         string  — auto-generated
schoolId          string  — parent school
fullName          string
classArm          string  — e.g. "JSS 2A"
level             string  — "JSS1" | "JSS2" | "JSS3" | "SS1" | "SS2" | "SS3"
gender            string
parentPhone       string
parentEmail       string  (optional)
admissionNumber   string  (optional, school's own number)
enrolledAt        timestamp
status            string  — "active" | "graduated" | "withdrawn"
```

---

### 3. `scores`
One document per student per subject per term per session.
This is the richest AI training data.

```
scoreId           string
schoolId          string
studentId         string
studentName       string
classArm          string
subject           string
term              string
session           string
CA                number  — 0–40
exam              number  — 0–60
total             number  — computed: CA + exam
grade             string  — A1, B2... F9
remark            string  — "Excellent" | "Pass" | "Fail" etc
teacherId         string  (optional)
recordedAt        timestamp
updatedAt         timestamp
```

---

### 4. `payments`
Every fee payment per student.

```
paymentId         string
schoolId          string
studentId         string
studentName       string
classArm          string
term              string
session           string
amount            number
paymentDate       timestamp
method            string  — "cash" | "transfer" | "POS"
receivedBy        string  — staff name
receiptNumber     string  (optional)
notes             string  (optional)
createdAt         timestamp
```

---

### 5. `staff`
All staff at a school.

```
staffId           string
schoolId          string
fullName          string
role              string  — "Principal" | "Teacher" | "Bursar" | "Admin"
phone             string
email             string  (optional)
subjects          array   — subjects they teach (for teachers)
classArm          string  (optional — form teacher assignment)
salary            number  (optional)
joinedAt          timestamp
status            string  — "active" | "inactive"
```

---

### 6. `attendance` (v2)
Daily register per class.

```
attendanceId      string
schoolId          string
classArm          string
date              string  — "YYYY-MM-DD"
term              string
session           string
records: [
  { studentId, studentName, status: "present"|"absent"|"late" }
]
takenBy           string  — staffId
createdAt         timestamp
```

---

### 7. `expenses`
School expenditure tracking.

```
expenseId         string
schoolId          string
category          string  — "Salary" | "Maintenance" | "Supplies" | "Utilities" | "Other"
description       string
amount            number
date              timestamp
approvedBy        string
createdAt         timestamp
```

---

### 8. `exam_enrollments` (v2 — Exam Pass Guarantee)
Tracks which students are on the guarantee plan.

```
enrollmentId      string
schoolId          string
studentId         string
studentName       string
classArm          string
subject           string
term              string
session           string
targetScore       number  — agreed pass mark (e.g. 50)
amountPaid        number
enrolledAt        timestamp
status            string  — "active" | "passed" | "failed" | "refunded"
refundEligible    boolean
refundAmount      number  (70% of amountPaid)
refundIssuedAt    timestamp | null
completionRate    number  — % of modules completed (0–100)
mocksTaken        number  — number of mock exams completed
passedAt          timestamp | null
```

---

### 9. `learning_sessions` (v2 — AI Training Data)
Every time a student engages with learning content.
This feeds the Unified Vector Lake.

```
sessionId         string
schoolId          string
studentId         string
subject           string
topic             string
term              string
durationSeconds   number
actionsCount      number  — questions attempted
correctCount      number
incorrectCount    number
skippedCount      number
engagementType    string  — "active" | "passive"  ← refund anti-gaming signal
languageUsed      string  — "en" | "yo" | "ha" | "pcm" (Pidgin)
struggledTopics   array   — topics where >2 wrong attempts
masteredTopics    array   — topics with >80% correct
deviceType        string  — "mobile" | "desktop"
startedAt         timestamp
endedAt           timestamp
```

---

## ADMIN PORTAL COLLECTIONS

### 10. `admin_agents`
```
agentId           string
name              string
phone             string
commission        number  — percentage
joinedAt          timestamp
status            string  — "active" | "inactive"
```

### 11. `admin_deals`
```
dealId            string
schoolName        string
school: { name, phone, email, address, state, lga }
agent: { name, phone }
tier: { name, price, max }
terms             number
status            string  — "pending" | "approved" | "rejected"
submittedAt       timestamp
approvedAt        timestamp | null
rejectedAt        timestamp | null
schoolId          string | null  — filled on approval
```

### 12. `admin_ledger`
Commission ledger per agent per deal.

```
ledgerId          string
dealId            string
schoolId          string
agent             string
agentPhone        string
amount            number
paid              boolean
paidAt            timestamp | null
date              timestamp
```

### 13. `admin_approved_schools`
Snapshot of approved school for portal display.

```
_id               string  — Firestore doc id
schoolId          string
schoolName        string
principalPhone    string
principalEmail    string
password          string
tier              string
tierPrice         number
agentName         string
agentPhone        string
approvedAt        timestamp
plan              string
termsPaid         number
```

### 14. `admin_activity`
Audit log — every admin action.

```
message           string
timestamp         timestamp
adminId           string  (future)
```

### 15. `admin_settings`
Single document: `admin_settings/main`

```
adminPassword     string
defaultSchoolPassword string
autoCAC           string
whatsappTemplate  string
updatedAt         timestamp
```

### 16. `admin_cac`
Single document: `admin_cac/progress`

```
raised            number
updatedAt         timestamp
```

### 17. `admin_opportunities`
Job/scholarship board managed by admin.

```
oppId             string
title             string
provider          string
type              string
amount            string
deadline          string
eligibility       string
url               string
createdAt         timestamp
```

---

## RELATIONSHIPS MAP

```
admin_agents  ──(1:many)──▶  admin_deals
admin_deals   ──(1:1)──────▶  schools         (on approval)
schools       ──(1:many)──▶  students
schools       ──(1:many)──▶  staff
students      ──(1:many)──▶  scores
students      ──(1:many)──▶  payments
students      ──(1:many)──▶  exam_enrollments  (v2)
students      ──(1:many)──▶  learning_sessions (v2)
schools       ──(1:many)──▶  attendance        (v2)
schools       ──(1:many)──▶  expenses
admin_deals   ──(1:1)──────▶  admin_ledger
```

---

## EXAM PASS GUARANTEE — DATA FLOW (v2)

### How it works:
1. School pays ₦2,500–₦4,000 per student per subject
2. `exam_enrollment` record created with targetScore
3. Student studies → every session logged in `learning_sessions`
4. System tracks completionRate and mocksTaken automatically
5. At end of term, score recorded in `scores`
6. **Refund trigger logic:**
   - completionRate >= 80% AND mocksTaken >= 3 AND total < targetScore
   - → refundEligible = true, refundAmount = amountPaid * 0.7
   - → admin notified via admin_activity log
7. Admin processes refund manually (or auto via Paystack in v2.1)

### Anti-gaming logic (engagementType):
- "passive" = opened session, scrolled, did not attempt questions
- "active" = attempted at least 1 question per 5 minutes of session
- Only "active" sessions count toward completionRate
- Prevents: child logs in, leaves phone, claims refund

---

## UNIFIED VECTOR LAKE FIELDS (Stage 2 prep)
Every `learning_sessions` record will be vectorized with:
- studentId, subject, topic, language, engagementType
- struggledTopics, masteredTopics
- correctCount/actionsCount ratio (mastery signal)
- durationSeconds (attention signal)

These become the first African educational AI training dataset.

---

## STORAGE ESTIMATES (Firebase free tier safety)

| Schools | Students | Daily reads | Daily writes | Firestore cost |
|---------|----------|-------------|--------------|----------------|
| 10      | 500      | ~2,000      | ~200         | Free           |
| 50      | 2,500    | ~10,000     | ~1,000       | Free           |
| 200     | 10,000   | ~40,000     | ~4,000       | ~$5/month      |
| 500     | 25,000   | ~100,000    | ~10,000      | ~$25/month     |
| 2,000   | 100,000  | ~400,000    | ~40,000      | ~$100/month    |

→ Migrate to Supabase self-hosted at 200 schools (~₦15,000/month VPS)
→ Move to own server at 2,000 schools

---

*End of Architecture Blueprint v1.0*
*Next: Implement exam_enrollments + learning_sessions in School Bloom v2*
