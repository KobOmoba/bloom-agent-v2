# EduBloom Africa Expansion Blueprint
### AariNAT Company Limited | Abeokuta, Nigeria
*Version 1.0 — June 2026 | Built inline with EduBloom v2*

---

## EXECUTIVE SUMMARY

EduBloom started as a fee-leakage recovery toolkit for one Nigerian school.
It is now a full school commerce platform with a proven data architecture,
an agent network, and an AI training layer already built into the product.

This blueprint is the roadmap from **Abeokuta → Nigeria → West Africa → Continent**.

---

## WHERE WE ARE TODAY — EduBloom v2

### The Suite (3 apps, 1 architecture)

| App | Who Uses It | Status |
|-----|-------------|--------|
| **School Bloom v2** | Principal / Bursar / Teacher | 🚧 Active dev |
| **Bloom Agent v2** | Field sales agents | 🚧 Active dev |
| **Bloom Portal v2** | AariNAT HQ (admin) | 🚧 Active dev |

### What v2 Already Has Built
- ✅ Offline-first sync queue (works with zero internet)
- ✅ Fee collection + WhatsApp reminders
- ✅ Student management + OCR import (AI-powered, 3-layer fallback)
- ✅ Scores / grade tracking
- ✅ Attendance register
- ✅ Staff management
- ✅ Expenses tracker
- ✅ Exam Pass Guarantee with anti-gaming logic
- ✅ Learning Sessions — AI training data layer
- ✅ Agent commission tracker + leaderboard
- ✅ Deal pipeline (submit → approve → activate school)
- ✅ Unified Vector Lake schema (Stage 2 ready)
- ✅ Firebase → Supabase → Own server migration path baked in

### The Data Architecture Principle
> "Every student interaction is a data point for the Unified Vector Lake"

Every score, every session, every fee payment, every attendance record
is timestamped, school-isolated, and schema-stable.
This is not just a school management app — it is an African education dataset
being built one classroom at a time.

---

## AARI — THE AI BACKBONE

Aari is EduBloom's AI layer. Named after AariNAT, it is the intelligence
that will eventually sit across every part of the platform.

### Aari v1 (Now — embedded in apps)
- OCR engine: reads handwritten class registers (Base44 → Gemini → OCR.space fallback)
- WhatsApp automation: fee reminders, safety alerts (8:30am + 9:30am daily)
- Score analysis: grade trends per student per subject
- Fee leakage calculator: shows school how much money they are losing

### Aari v2 (6–12 months — requires 50+ schools)
- Predict which students will fail before exams (Exam Pass Guarantee trigger)
- Identify fee defaulter patterns by term, class, and payment method
- Smart attendance alerts: flag students missing 3+ days
- Agent performance coaching: tell agents which school types close fastest

### Aari v3 (12–24 months — requires 500+ schools)
- Cross-school benchmarking: "Your JSS2 maths scores are 18% below state average"
- Subject mastery maps per LGA — what topics Nigerian students struggle with most
- First African school credit score: lend schools equipment based on their data
- Multilingual voice interface: Yoruba, Hausa, Igbo, French, Pidgin

### Aari Vision (Stage 2 — Unified Vector Lake)
Every `learning_sessions` record vectorized with:
- studentId, subject, topic, language, engagementType
- struggledTopics, masteredTopics
- correctCount / actionsCount (mastery signal)
- durationSeconds (attention signal)

This becomes the first AI model trained exclusively on African classroom data.
Not adapted from Western curricula. Built from African schools, for African schools.

---

## EXPANSION ROADMAP

### Stage 0 — Proof of Concept (NOW)
**Target:** 10–20 schools | Ogun State, Nigeria
**Focus:** Product works perfectly, agents earn real commission
**Revenue model:** ₦15,000–₦50,000/term per school
**Tech stack:** Firebase + GitHub Pages PWA
**Milestone:** ₦250,000 CAC reactivation raised

### Stage 1 — State Rollout (6–12 months)
**Target:** 200 schools | Lagos, Ogun, Oyo, Osun, Ekiti
**Focus:** Agent network scaling, portal automation
**Revenue model:** Subscription tiers + Exam Pass Guarantee
**Tech:** Firebase → Supabase migration at 200 schools
**New features:**
- PDF report card generator (live in v2)
- Paystack fee collection (BloomCollect)
- Parent portal — parents see fees, results, attendance
- SMS fallback for parents without WhatsApp

### Stage 2 — National (12–24 months)
**Target:** 2,000 schools | All 36 states + FCT
**Focus:** Agent franchise model, DFI engagement
**Revenue model:** Platform fee + BloomCollect transaction % + Aari AI subscription
**Tech:** Own server + Supabase + ML Kit Android app
**New features:**
- Native Android app (ML Kit OCR — fully offline)
- BloomCollect: process school fees directly through platform
- School procurement aggregation (bulk buy stationery, furniture)
- Aari v2 predictive analytics
- Government pilot programmes (UBEC, state education ministries)

### Stage 3 — West Africa (24–36 months)
**Target:** 10,000 schools | Nigeria + Ghana + Côte d'Ivoire + Senegal + Benin
**Focus:** Multi-currency, multilingual, franchise agents per country
**Revenue model:** BloomCollect + Aari SaaS + Data partnerships
**Tech:** Multi-region deployment, French language pack
**New features:**
- French UI (West Africa francophone belt)
- Multi-currency: NGN, GHS, XOF, XAF
- Cross-border school benchmarking
- AfDB / IFC DFI partnership data reports
- Aari v3 cross-school intelligence

### Stage 4 — Continental (36–60 months)
**Target:** 50,000 schools | SSA + East Africa + North Africa
**Focus:** African education data standard
**Revenue model:** Platform + Data + AI licensing
**New markets:** Kenya, Uganda, Tanzania, Ethiopia, South Africa
**Languages:** Swahili, Amharic, Zulu, Arabic
**The prize:** Africa's first school commerce network and education AI

---

## BUSINESS MODEL EVOLUTION

| Stage | Primary Revenue | Secondary |
|-------|----------------|-----------|
| Stage 0 | School subscriptions | — |
| Stage 1 | Subscriptions + Exam Guarantee | Agent commissions |
| Stage 2 | BloomCollect transaction % | Aari AI subscription |
| Stage 3 | BloomCollect + Aari SaaS | Data partnerships |
| Stage 4 | Platform + AI licensing | DFI grants |

### Unit Economics (Stage 1 target)
- Average school pays: ₦30,000/term × 3 terms = ₦90,000/year
- 2,000 schools × ₦90,000 = **₦180,000,000/year** base revenue
- BloomCollect 1.5% on ₦500M fees processed = **₦7,500,000/year** (growing fast)
- Exam Pass Guarantee: ₦3,000/student × 50 students/school = ₦150,000/school bonus

---

## TECH MIGRATION PATH

```
NOW                    200 schools           2,000 schools         10,000+
─────────────────────────────────────────────────────────────────────────
Firebase Firestore  →  Supabase (self-host) → Own server + PG  →  Distributed
GitHub Pages PWA    →  PWA + Play Store      → Native Android    →  Multi-platform
Gemini API OCR      →  Base44 + ML Kit       → Full offline ML    →  Edge AI
WhatsApp manual     →  WhatsApp API (360dialog) → SMS + WhatsApp  →  All channels
```

### Why this migration path is already baked in:
The data architecture v2 design principle states:
> "Firebase Firestore now → Supabase self-hosted at 200 schools → Own server at Stage 2"

Every collection carries `schoolId`. Every record is schema-stable.
No data migration needed — just switch the connection string.

---

## THE ANDROID APP STRATEGY

When EduBloom reaches 200+ schools, a native Android app becomes essential.

### Phase 1: Capacitor Wrapper (quick)
- Wrap the existing PWA in Capacitor
- Gets on Google Play Store immediately
- ML Kit Text Recognition replaces browser OCR
- Works fully offline

### Phase 2: Full Native Android (Stage 2)
- Purpose-built Android app
- ML Kit: OCR, Face Detection (attendance), Barcode scan (student IDs)
- Offline-first: all data syncs when connection returns
- Optimised for budget Android phones (2GB RAM, Android 8+)
- Low-data mode: compresses images before upload

### Why Android-first, not iOS:
- 95%+ of Nigerian schools use Android
- Same across Ghana, Côte d'Ivoire, East Africa
- iOS when entering South Africa (Stage 4)

---

## AGENT NETWORK MODEL

Agents are the sales force AND the onboarding team.
The Bloom Agent v2 app tracks everything.

### Agent Tiers
| Tier | Schools Signed | Monthly Earning |
|------|---------------|-----------------|
| Starter | 1–5 | ₦15,000–₦75,000 |
| Silver | 6–15 | ₦90,000–₦225,000 |
| Gold | 16–30 | ₦240,000–₦450,000 |
| Platinum | 31+ | ₦465,000+ |

### State Franchise Model (Stage 2)
- 1 State Manager per state (36 states)
- Each manages 5–20 field agents
- State Manager earns override commission on all agents below
- Bloom Portal shows State Manager their own territory dashboard

---

## INVESTOR NARRATIVE

EduBloom is not a school management app.

It is the **data infrastructure layer for African education** — built bottom-up,
school by school, through a field agent network that no VC-funded startup
can replicate from Lagos or Nairobi.

**The moat:**
1. Agent relationships — principals trust the person who walked into their school
2. Data depth — 17 collections per school, every interaction timestamped
3. Offline-first — works where Starlink doesn't reach yet
4. Aari — an AI model trained on African classroom data, not Western proxies

**The ask (Series A — Stage 2):**
- $500,000 USD
- Use: Engineering team (5 devs), 36 state managers, Android app, BloomCollect
- Return: 10,000 schools × $200/year = $2M ARR + BloomCollect transaction volume

**DFI alignment:**
- AfDB Education for All strategy
- IFC EdTech Africa portfolio
- USAID Equitable Learning
- UK-Nigeria Tech Hub

---

## SUCCESS METRICS BY STAGE

| Metric | Stage 0 | Stage 1 | Stage 2 | Stage 3 |
|--------|---------|---------|---------|---------|
| Schools | 20 | 200 | 2,000 | 10,000 |
| States | 1 | 5 | 36 | +4 countries |
| Agents | 5 | 50 | 500 | 2,000 |
| Students in system | 2,000 | 40,000 | 600,000 | 5,000,000 |
| Monthly Revenue | ₦300K | ₦3M | ₦30M | ₦150M |
| Aari training records | 10K | 500K | 20M | 500M |

---

## WHAT AARINAT COMPANY LIMITED BECOMES

At Stage 4, AariNAT is not a school SaaS company.

It is the **infrastructure company for African education** — the rails that
school fees, learning data, and school credit flow through.

Think: what Stripe did for payments, what Twilio did for communications —
AariNAT does for African schools.

The name says it all: **AariNAT** — Aari (our AI) + NAT (network).
A network powered by African intelligence, built for African classrooms.

---

*"Built with grit from Abeokuta, for every school that deserves clarity over its cash."*
*— AariNAT Company Limited*

