# DHRUV: problem-statement audit and production plan

**Problem statement:** SIH26063, *Integrated Polar Science Outreach, Knowledge Repository and Media Dissemination Portal* (MoES / NCPOR, Software, Smart Education).
**Audit date:** 25 September 2026. Every finding below was verified by running the app, not by reading code alone.

**How it was tested:**
- Crawled all 20 public routes in EN + HI on desktop and mobile, plus 7 admin routes: 92 page loads.
- Checked 95 internal links.
- Ran an axe WCAG 2.1 AA scan.
- Did a production build and tested anonymous access to every staff API.
- Measured Core Web Vitals under a slow-4G / 4x-CPU mobile profile.
- Ran live Ask Dhruv queries in EN and HI.
- Inventoried the database and ran `tsc --noEmit` and `npm audit`.

---

## Status (updated 25 Sep 2026, evening)

> **Focus changed (25 Sep 2026, night):** the team is building a worthy, working SIH prototype first. Phases 2–4 below are deferred and become roadmap material for the pitch. The plan of record is now [`SIH_PLAN.md`](SIH_PLAN.md) (system design, problem-statement coverage, innovations, sprint order, demo and pitch). This file keeps the audit, which is still accurate, and the production roadmap.

**Phase 0 is complete in code and verified.** Evidence:
- typecheck: 0 errors
- production build passes
- 15 Playwright tests pass: the 12 original plus 3 new Phase 0 regression tests (false attributions, 404 + skip link, security headers)
- axe WCAG 2.1 AA: 0 violations on 21 pages, in EN and HI
- security policy (CSP) enforced with 0 violations
- production-mode checks: anonymous `/admin` → 307 to `/login`; staff APIs → 401; sign-in, role-based navigation and sign-out work

One step is waiting on you: run `supabase/migrations/20260925_05_phase0_integrity.sql` in the Supabase SQL editor. Until then, covers resolve by thumbnail URL and still show their credits.

### Non-negotiable principle: open source and free
The whole product must be **open source and cost nothing to run**, yet production-grade. Every component below is open source and self-hostable:

| Component | Choice | Free tier used for the SIH demo? |
|---|---|---|
| Web app | Next.js (MIT) | – |
| Database, auth, storage | Postgres + pgvector, Supabase (Apache-2.0, self-hostable) | Supabase free tier |
| Job queue | pgmq, inside Postgres | – |
| LLM | Open-weight models (Qwen / Gemma / Llama family) served by **Ollama** (MIT) | Gemini free tier, behind `lib/ai/llm.ts` |
| Embeddings | **bge-m3** (MIT), multilingual, 1024-dim: same schema, no migration | Voyage free tier until swapped |
| Error tracking | GlitchTip (MIT, Sentry-compatible) | – |
| Analytics | Umami (MIT) or our own `analytics_events` table | – |
| Uptime | Uptime Kuma (MIT) | – |
| Bot protection | ALTCHA (MIT, proof-of-work, no tracking) + Postgres rate limits | – |
| Hosting | Docker Compose on any VM (NIC / MeitY-empanelled cloud in production) | A free hosting tier for the public demo URL |

Rule: a free hosted API may be used for the demo **only** behind an abstraction that has a working open-source replacement (Phase 1 task 1.0). No payment methods, no paid tiers.

---

## 0. Verdict

| Question | Answer |
|---|---|
| Does it satisfy SIH26063? | **Partly, about 65%.** Repository, AI pipeline, website content and Smart Education are real and working. **Videos, institutional activities, and actual media dissemination (publishing to social media) are missing.** The title literally says "Media Dissemination Portal", and dissemination is the weakest part. |
| Is it production-ready? | **No.** About **6/10 as a hackathon prototype** (my earlier 7 was generous; testing everything found integrity issues) and **about 3/10 as a production system**. |
| What is broken? | 5 critical, 10 high and 12 medium issues (section 2). The most dangerous are **false attributions to NCPOR/PIB on public pages**, **stock photos presented as polar expeditions**, **public super-admin quick-login**, and **Antigravity running a second dev server that corrupts builds**. |
| Can it reach 10/10? | For SIH: yes. Phase 0 + Phase 1 is about 3–5 working days for two agents plus the team (section 6). For real production at NCPOR: Phase 2 + Phase 3, about 10–14 weeks, gated by NCPOR/NIC processes (security audit, GIGW/STQC, hosting). |

---

## 1. Coverage of the problem statement

> "Develop a comprehensive outreach portal that **archives expedition reports, scientific datasets, publications, photographs, videos and institutional activities** while **generating content for websites and social media**." Theme: **Smart Education**.

| PS requirement | Status | What exists (verified) | Gap to close |
|---|---|---|---|
| Outreach portal | ✅ | Home + 3D globe, Explore, Gallery, News, Learn, Ask Dhruv, station pages, EN/HI | 5 pages still in the old style; mobile load is slow (section 2) |
| Expedition reports | 🟡 | 4 reports with AI summaries (scientific, simple, Hindi), key findings, related items | **0 of 24 assets linked to any expedition**; no expedition detail page; expedition dates marked "approximate" |
| Scientific datasets | 🟡 | 2 datasets (NSIDC sea ice) with AI-extracted variables and coverage | No preview or chart, no DOI, no "cite this dataset", no link to NCPOR's **National Polar Data Center (NPDC)** |
| Publications | 🟡 | 2 publications, APA/BibTeX citation modal | No DOI lookup, sparse metadata |
| Photographs | ✅ | 16 credited photos, AI captions + alt text, gallery | No albums, filters or EXIF; gallery is slow on phones (LCP 9.9 s) |
| **Videos** | ❌ | 0 videos; ingestion has no video path | Video ingest (upload + YouTube link), AI summary, chapters, EN/HI captions, accessible player |
| **Institutional activities** | ❌ | `/events` page exists but is empty (0 events) | Events model, upcoming/past, calendar, event pages with linked media, AI announcement + recap |
| Content for websites | ✅ | AI blog + press release (EN/HI) → review → approve → publish to `/news` | Posts contain `localhost` links and false "PIB / NCPOR Media Cell" labels; no scheduling, newsletter or RSS |
| **Content for social media** | 🟡 | AI campaigns for X / Instagram / LinkedIn / Facebook with two-person approval | **Nothing is actually published**; no social images; content calendar link is a 404 |
| Smart Education (theme) | ✅ | 4 lessons (3 EN, 1 HI), quizzes graded server-side, certificates, public verification | Only 4 lessons; no teacher kit; 0 certificates exist to show; certificates store minors' names without a consent notice |

---

## 2. What is broken (verified)

### Critical: fix before anyone outside the team sees it

| # | Issue | Evidence | Fix | Effort | Owner |
|---|---|---|---|---|---|
| C1 | **Antigravity keeps starting a second dev server** that writes into the same `.next` folder and corrupts the build. Result: pages return 500 ("Expected clientReferenceManifest"), and the UI goes blank. This is the same cause as your earlier "UI not visible" problem. | `/asset/[id]` returned **HTTP 500 after 31 s**. Process tree: `Antigravity IDE → powershell "npm run dev"` at 15:32 (port 3001), and again at 15:50 after I stopped it. | `scripts/dev.mjs` guard: `npm run dev` exits with "already running on :3000, reuse it". Agents get their own `NEXT_DIST_DIR`. Rule restated in AGENTS.md. | 0.5 h | CC |
| C2 | **False attributions to real organisations on public pages.** Every asset carries a badge "AI-assisted · **Reviewed by NCPOR**"; News shows "**PIB Press Release**", "Source: **NCPOR Media Cell**" and "**published directly by NCPOR**"; social previews post as "**@NCPOR_India**"; press releases get an **invented dateline** ("Goa, 25 September 2026 —"); the admin page says "AI: **Claude Sonnet & Haiku**" but the app runs on Gemini; the login page is titled "**NCPOR Staff Login**" and asks for an "Official Email Address". | `messages/en.json:82,85,87,269`, `lib/ai/campaign.ts:21`, `app/admin/page.tsx`, `app/login/page.tsx`, screenshots | Honest labels: "AI-drafted, approved by DHRUV staff", "Press release (draft)", no invented datelines, the real provider name, "DHRUV staff sign-in (prototype)". Regenerate the 7 existing posts. | 1.5 h | CC |
| C3 | **Stock photos presented as polar expeditions**: an Alpine peak for the 1981 Antarctica expedition, a **jungle waterfall** for the Svalbard campaign, **pine trees** for the 44th Antarctic expedition (Antarctica has no trees), and a generic aurora photo for Maitri. None are credited. | `/expeditions` and `/stations/[id]` screenshots | Use credited photos already in the archive (Dakshin Gangotri, Maitri, Bharati, Himadri), or no image | 1 h | CC |
| C4 | **Published posts link to `http://localhost:3000/...`**. All 4 published and 3 in-review posts do. They will be broken the moment the site is deployed. | `/news` screenshot; `app/api/campaign/route.ts:16` falls back to localhost | Build links when the page renders (relative links), set `NEXT_PUBLIC_SITE_URL` per environment, patch the 7 posts | 1 h | CC |
| C5 | **Fake data fallback**: if the database errors, public pages silently show `MOCK_ASSETS`, which are invented report titles that look real ("Glaciers Melt and Ice Dynamics in Schirmacher Oasis: 2023 Technical Report"). | `lib/db/supabase.ts:86,90` | Show an error state; use mock data only when Supabase isn't configured at all | 0.5 h | CC |

### High

| # | Issue | Evidence | Fix | Effort | Owner |
|---|---|---|---|---|---|
| H1 | **Anyone can open `/admin` pages** in a production build. The APIs correctly return 401, so strangers see a broken admin screen. | prod build: `GET /admin` → 200 anonymous; 9 staff APIs → 401 | Server-side guard in `app/admin/layout.tsx` (redirect to `/login?next=`), role-aware sidebar, real user badge, logout | 1 h | CC |
| H2 | **Login page is pre-filled** and has "Demo judge quick accounts", **including Super Admin**. On a public URL, anyone could sign in as super admin and publish content under NCPOR's name. | `/login` screenshot | Remove the prefill. Quick accounts only when `DEMO_MODE=true`, never super admin, demo data isolated. Rotate the demo passwords. | 0.5 h | CC |
| H3 | Admin sidebar links **`/admin/calendar` and `/admin/users` → 404**; `/admin/lessons` is missing from the sidebar | link check: 2 × 404 of 95 links | Build the calendar and users/audit pages (Phase 1), or hide them until built | see 1.6/1.7 | CC+AG |
| H4 | **Expeditions are dead ends**: no detail page, 0 assets linked, "Explore expedition assets" shows nothing, dates "approximate". | DB inventory; `/expeditions` | `/expeditions/[id]` page; AI suggests links during ingest and staff confirm; dates verified from PIB/NCPOR sources | 4 h | CC+AG |
| H5 | **Ask Dhruv can't answer expedition questions.** In Hindi, "when was India's first Antarctic expedition?" was answered with the first *station* (1983) and misspelled मैत्री as "मैत्रो". | live `/api/chat` test | Add expeditions, events and lessons to the knowledge base; build a golden test set of 40 EN/HI questions and track the score | 5 h | CC |
| H6 | **Hindi search misses most content**: "अंटार्कटिका" → 2 results, "Antarctica" → 13. Explore uses keyword search only. | direct query test | Use the existing `hybrid_search` (semantic, cross-language) in Explore | 3 h | CC |
| H7 | **Home page is heavy on first load**: mobile (slow 4G) LCP 8.3 s, main thread blocked 6.0 s; desktop LCP 4.5 s, TBT 2.6 s, 1.66 MB. Gallery mobile LCP 9.9 s. It runs at 60 fps once loaded; the problem is the load. | `vitals.mjs` on the production build | Poster image as the first paint; load three.js when idle or visible; 699 KB texture → WebP/AVIF about 150 KB; smaller texture on mobile; responsive thumbnails (320/640/1280) | 5 h | CC |
| H8 | **No security headers** (no CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy); `X-Powered-By: Next.js` exposed | `curl -I` on the prod build | Headers in `next.config.ts` (CSP report-only first, then enforce) | 1 h | CC |
| H9 | **Not in git, not deployed.** One bad agent run could lose everything; SPEC P0 says "works on the deployed URL". | `git rev-parse` fails | git now (done); private GitHub push + free demo hosting in Phase 1 | 0.5 h + 2 h | CC+YOU |
| H10 | **Licence silently defaults to "CC-BY-4.0"** in the database and UI, so any upload without a licence claims an open licence NCPOR may not grant | schema `license DEFAULT 'CC-BY-4.0'`; `AssetDetailView` fallback | Required field with a fixed list (CC BY, CC BY-SA, Public domain, GODL-India, "© NCPOR, all rights reserved") | 0.5 h | CC |

### Medium

| # | Issue | Evidence | Fix | Effort |
|---|---|---|---|---|
| M1 | 5 public pages (expeditions, events, gallery, news, stations), the asset page, all 5 admin pages and login are still in the old style (cyan gradients, gradient buttons) | screenshots | Restyle to the §3a design system | AG 8 h |
| M2 | **Accessibility, axe WCAG 2.1 AA**: *critical* `select-name` (Explore ×3, Upload ×5, Studio ×2, Lessons ×3), *critical* `label` (Upload), *serious* `color-contrast` (asset pages up to 9 nodes, Studio ×4). No skip link on any page. | axe results | Labels, contrast, skip link, keyboard pass | AG 2 h |
| M3 | **12 pages share one generic `<title>`**, in English even on Hindi pages; OG images only on photos; no sitemap/robots; default English-only 404 page | crawl meta check | Per-page bilingual titles, OG images, `sitemap.ts`, `robots.ts`, branded EN/HI `not-found.tsx` + `error.tsx` | CC 2 h |
| M4 | Hydration mismatch on the home page for users with "reduce motion" on (`ParallaxImage` renders a different transform on server and client) | console diff | Render a static image until mounted | CC 0.3 h |
| M5 | PDF preview embeds the **whole file (19 MB) on every page view**, and doesn't render on phones | browser check | First pages as images at ingest; full viewer on demand | CC 2 h |
| M6 | No ESLint (`npm run lint` can't run); `npm audit`: 2 advisories in Next's bundled PostCSS (build-time; fixed in Next 16) | tooling check | ESLint (next + jsx-a11y); plan the Next 16 upgrade after SIH | CC 1 h |
| M7 | Rate limiting is in-memory (resets per instance); no bot protection on Ask | `lib/rate-limit.ts` | Postgres counters (shared across instances); ALTCHA proof-of-work on Ask in production | CC 1.5 h |
| M8 | Uploads accept any MIME type up to 50 MB; buckets have no MIME or size limits; no malware scan | `uploads.ts`, bucket config | Allow-list, magic-byte check, bucket limits; ClamAV in the Phase 2 worker | CC 1 h |
| M9 | Background jobs: no retry or queue; a killed function leaves a job "running" forever | `ingest.ts` | Stuck-job reaper + retry now; durable queue (pgmq) in Phase 2 | CC 2 h |
| M10 | Every route is rendered on every request (no caching); `fetchAssets()` loads the whole table (`select('*')`) and filters in JavaScript | build output, code | Caching with revalidation on publish; database-side filters; pagination | CC 3 h |
| M11 | Certificates store a student's **name + school** (often minors) with no notice, consent or retention rule (DPDP Act) | `quiz/[id]/submit` | Name optional (initials allowed), school optional, consent note, retention period | CC 1 h |
| M12 | Demo data gaps: **0 certificates** (nothing to verify), view tracking records nothing in dev (works in the production build, verified), test analytics events from scripts (11 `quiz_complete`, plus my audit's 3 views / 4 downloads) | DB | Demo from a production build; purge test events before the dashboard | CC 0.5 h |

**Verified working** (keep it that way):
- TypeScript: 0 errors.
- Production build passes.
- Staff APIs return 401 to anonymous users (9 of 9).
- The quiz answer key never reaches anonymous users.
- No horizontal overflow at 390 px.
- No raw i18n keys or "undefined".
- 0 broken images.
- 93 of 95 internal links are OK.
- Public pages are fully in Hindi. The gaps: login, 404 and admin are English-only, and English lessons are listed on the Hindi Learn page (labelled "English").
- Ask Dhruv answers in 3.8 s (EN) and 5.4 s (HI) with citations.
- Hindi search works (lower recall, H6).
- 60 fps while scrolling after load.

---

## 3. What 10/10 means (measurable)

| Area | Today | 10/10 means |
|---|---|---|
| PS coverage | 6.5 | Every noun in the PS is demoable with **real, credited** content: ≥10 reports linked to expeditions, ≥5 datasets with preview, ≥5 publications, ≥30 photos, **≥5 videos with EN/HI captions**, **≥10 institutional activities** (past + upcoming), website + social content generated → approved → **actually published** to at least one live channel, with a calendar and metrics |
| Content integrity | 4 | Zero unverified claims: every asset has source + licence + credit; every AI output is labelled as AI-drafted and says who approved it; no stock imagery passed off as NCPOR; no invented dates; a mock data path is impossible in production |
| Public UI | 7.5 | All pages on one design system; EN/HI parity 100% (including login and 404); 60 fps; no dev artifacts |
| Performance | 6 | Mobile (slow 4G): LCP < 2.5 s, TBT < 300 ms, CLS < 0.1 on every public page; Lighthouse mobile ≥ 90 |
| Admin UX | 3.5 | Consistent design, no dead links, real stats, content calendar, users & roles, audit log viewer, source-vs-AI side-by-side review |
| AI quality | 7 | Golden test set (≥40 EN/HI questions): ≥90% correct, ≥95% citation precision, 100% refusal on out-of-scope; a fluent Hindi reviewer signs off on the style guide; cost and latency dashboard |
| Search | 6.5 | Cross-language semantic + keyword search in Explore; Hindi query recall within 20% of English; facets; pagination |
| Security | 5 | Admin guarded server-side, MFA for staff, no public privileged demo logins, CSP + headers (A grade on securityheaders.com), shared rate limits, upload allow-list + AV scan, keys rotated, OWASP ZAP baseline clean, ASVS L1 self-check |
| Accessibility | 6.5 | 0 axe violations; manual NVDA + keyboard pass; skip link; unique bilingual titles; text resize + high contrast; captions on all videos; accessibility statement (GIGW 3.0 = WCAG 2.1 AA) |
| Reliability | 4.5 | Durable job queue with retries + reaper, health endpoint, uptime monitor, error tracking, alerts, backups with a tested restore |
| Testing | 5.5 | CI on every push: typecheck, lint, unit tests (≥70% of `lib/`), Playwright EN/HI desktop/mobile, axe, AI eval smoke run |
| Deployment | 1 | Live URL, staging + production, CI/CD, Docker self-host path tested |
| Education | 7.5 | ≥12 lessons across all grade bands in EN + HI, teacher-reviewed; teacher kit (lesson plan + worksheet PDF); certificate with QR; privacy-minimal data |
| Compliance | 2 | GIGW 3.0 pages (privacy, terms, copyright, hyperlinking, accessibility statement, content moderation/archival/review policy, contact/feedback, sitemap, "last updated" stamps); DPDP notice + consent + retention |

---

## 4. Target architecture (production)

```
Public · students · teachers · NCPOR staff
        │ HTTPS
   [CDN + WAF]  (India region)
        │
   [Web: Next.js containers ×2+] ──── [Postgres: rate limits, answer cache]
        │        │
        │        ├── [Postgres 16 + pgvector + full-text]  primary + standby, PITR backups
        │        ├── [Object storage, S3-compatible]  archive (private) · public-media (CDN)
        │        └── [Auth]  email + MFA now → NIC Parichay SSO for staff (confirm with NIC)
        │
   [Job queue: pgmq in Postgres] ──► [Worker containers]
                                       ├─ ingest: PDF/OCR/visual, images (EXIF), datasets (CSV preview), video (ffmpeg, HLS, captions)
                                       ├─ AI gateway: Gemini / Claude / self-hosted, caching, budgets, logging, evals
                                       ├─ embeddings: self-hosted bge-m3 via Ollama (1024-dim, multilingual; Voyage only as demo fallback)
                                       ├─ publishers: Telegram · X · Facebook/Instagram · LinkedIn · YouTube (OAuth, scheduled)
                                       └─ newsletter / RSS / sitemap regeneration
   [Observability: OpenTelemetry → logs, metrics, traces · GlitchTip errors · Uptime Kuma · alerts]
   [CI/CD: GitHub Actions → staging → production · migrations · security scans]
```

**Key decisions to present:**
1. **NPDC stays the system of record for raw scientific data.** NCPOR already runs the National Polar Data Center (npdc.ncpor.res.in). DHRUV is the outreach front door: it links to or harvests dataset metadata and does not duplicate terabytes of data.
2. **One web app plus one worker.** No microservices: Postgres doubles as the queue, so there's no new infrastructure to run. This suits NCPOR's traffic and IT team size.
3. **AI is swappable.** The provider abstraction already exists, so NCPOR can move between Gemini, Claude, or an open model hosted in India without code changes. Only public content goes to external AI.
4. **Everything runs in India, in containers.**
   - SIH demo: a free hosting tier for the Next.js app + Supabase free tier (confirm the project region is Mumbai). The same Docker Compose file runs it anywhere.
   - Pilot: Docker Compose on one VM of a MeitY-empanelled cloud.
   - Production: NIC or an NCPOR data centre / empanelled cloud with HA.
5. **Governance is built in**: two-person approval (maker ≠ checker, already enforced), an append-only audit log (already recording, 63 entries), and honest AI labelling.

---

## 5. Workstreams and tasks

Owners: **CC** = Claude Code, **AG** = Antigravity (UI only, strict acceptance criteria, verified by CC), **YOU** = team.
Priority for SIH: **M** = must, **S** = should, **C** = could.

**Definition of done for every task:**
- typecheck and tests pass
- Playwright screenshots in EN/HI on desktop and mobile
- no console errors
- 0 axe critical/serious findings
- no unverified claims

### Phase 0: Stabilise and remove integrity risks — ✅ done 25 Sep 2026
Also fixed during Phase 0 (found while working): certificates printed "Government of India · Ministry of Earth Sciences" and "NCPOR Verified" (now clearly a DHRUV prototype certificate, marked noindex); the asset pages' search-engine data named NCPOR as publisher of every item, including third-party photos (removed); the gallery used private storage paths as image URLs; the upload form had no licence field; Explore ignored `?station_id=` / `?expedition_id=` links; prompts told the AI to attribute statements to "NCPOR scientists"; the admin sidebar ignored roles; certificates required a school name (now optional, with a privacy note).
| # | Task | Owner | Est. |
|---|---|---|---|
| ✅ 0.1 | `git init` and first commits (done); push to a private GitHub repo (waiting on your repo) | CC + YOU | 0.5 h |
| ✅ 0.2 | Dev-server guard (`scripts/dev.mjs`), separate distDir for agents, AGENTS.md rule, message to Antigravity | CC | 0.5 h |
| ✅ 0.3 | Integrity fixes C2: labels, prompt, provider status, login title, page titles not implying an official site; regenerate the 7 posts | CC | 1.5 h |
| ✅ 0.4 | Replace stock expedition and station images with credited archive photos (C3) | CC | 1 h |
| ✅ 0.5 | Links built at render time + patch posts + `NEXT_PUBLIC_SITE_URL` per environment (C4) | CC | 1 h |
| ✅ 0.6 | Remove the public mock fallback (C5) | CC | 0.5 h |
| ✅ 0.7 | Admin guard, role-aware sidebar, logout, hide dead links, add Lessons (H1, H3) | CC | 1 h |
| ✅ 0.8 | Login: no prefill, demo accounts behind `DEMO_MODE`, no public super admin (H2) | CC | 0.5 h |
| ✅ 0.9 | Security headers (H8) + licence vocabulary (H10) | CC | 1.5 h |
| ✅ 0.10 | Accessibility quick fixes: labels, contrast, skip link, bilingual titles, EN/HI 404 and error pages (M2, M3) | AG → CC verifies | 2 h |
| ✅ 0.11 | ParallaxImage hydration fix (M4) | CC | 0.3 h |

### Phase 1: SIH 10/10 (about 45 h must-haves, 70 h with should-haves; two agents in parallel)
| # | Task | Pri | Owner | Est. |
|---|---|---|---|---|
| 1.0 (code done, needs Ollama install + parity run) | **Open-source AI path**: an `ollama` provider in `lib/ai` (open-weight LLM + bge-m3 embeddings), selected by `AI_PROVIDER=ollama`; test set run on both providers to show quality parity; Docker Compose service for Ollama | M | CC | 5 h |
| 1.1 | **Deploy**: Dockerfile + Docker Compose (app, worker, Ollama) and a free public demo URL; production smoke tests against the live URL + QR code | M | CC + YOU | 3 h |
| 1.2 | **Videos**. YouTube link ingest: oEmbed plus Gemini video understanding for summary EN/HI, chapters, captions (VTT), keywords, social clip ideas. Direct upload for short clips. Accessible player with captions, transcript and chapters. Shown in gallery and Explore. | M | CC 6 h, AG 3 h | 9 h |
| 1.3 | **Institutional activities**. `events` table + RLS + API. Admin create/edit with AI announcement (before) and recap (after, from photos and notes). Public upcoming/past list, month calendar, filters, event page with linked media, add-to-calendar (.ics), schema.org Event. | M | CC 4 h, AG 3 h | 7 h |
| 1.4 | **Expeditions**: `/expeditions/[id]` with timeline, route map (`route_geojson`), linked reports/datasets/photos/videos/news; AI suggests expedition and station links during ingest, staff confirm | M | CC 4 h, AG 2 h | 6 h |
| 1.5 | **Real content**. CC researches, YOU verify: ≥10 institutional activities and verified expedition dates from ncpor.res.in and PIB releases, ≥5 official videos, more reports and datasets. Each has source link, licence and credit. A fluent Hindi reviewer checks the Hindi. | M | CC 3 h, YOU 2 h | 5 h |
| 1.6 | **Real dissemination**: `lib/publishers` with a live **Telegram** channel adapter; X / LinkedIn / Meta / YouTube adapters behind flags with an "export pack" until accounts are connected; `scheduled_at` + scheduler; **`/admin/calendar`**; generated social cards (1080², 1200×675, 1200×627) with credit line; RSS feed; UTM links + click tracking | M | CC 8 h, AG 3 h | 11 h |
| 1.7 | **Admin redesign**: 5 pages on the design system; dashboard with real stats and real AI provider; **`/admin/users`** (roles) + audit log viewer; review screen shows the source excerpt next to the AI output | M | AG 8 h, CC 3 h | 11 h |
| 1.8 | **Ask Dhruv**: expeditions, events and lessons in the knowledge base; golden test set (40 EN/HI) with a scored report; answer cache; content-gap queue (unanswered questions → staff) | M | CC 5 h, YOU 1 h | 6 h |
| 1.9 | **Mobile performance**: globe poster + deferred three.js, compressed textures, responsive thumbnails, paginated gallery, PDF page images (H7, M5) | M | CC | 5 h |
| 1.10 | **Compliance pages EN/HI**: privacy (DPDP), terms, copyright and licensing, hyperlinking, accessibility statement, content policy (moderation / archival / review), contact and feedback, sitemap page, "last updated" stamps; certificate data minimisation (M11) | M | AG 3 h, CC 2 h | 5 h |
| 1.11 | **Pitch**: deck, timed demo script, recorded backup video, 25 hardest judge questions with answers, architecture and cost slides | M | CC 4 h, YOU 3 h | 7 h |
| 1.12 | Cross-language semantic search in Explore + facets + pagination (H6, M10) | S | CC | 3 h |
| 1.13 | Datasets: CSV preview + auto chart (recharts is already installed), variables and coverage table, "cite this dataset", schema.org Dataset (visible to Google Dataset Search), NPDC link | S | CC 3 h, AG 1 h | 4 h |
| 1.14 | Publications: paste a DOI → auto-fill from Crossref (authoritative metadata, no AI guessing); BibTeX/RIS/APA export | S | CC | 2 h |
| 1.15 | Education: ≥8 more lessons (all grade bands, EN + HI) from the archive, teacher-reviewed; teacher kit PDF; certificate QR | S | CC 4 h, YOU 2 h | 6 h |
| 1.16 | Impact dashboard: real counts by language (views, downloads, searches, questions, lessons, certificates), content gaps, AI cost and latency; purge test events | S | CC 3 h, AG 2 h | 5 h |
| 1.17 | Reliability: job reaper + retry, GlitchTip error tracking, Uptime Kuma, Postgres rate limits (M7, M9). `/api/health` and the upload allow-list are done in Phase 0 | S | CC | 3.5 h |
| 1.18 | Quality: ESLint + jsx-a11y, unit tests (workflow, grading, chunking, campaign validation), Playwright axe + EN/HI + mobile suites, GitHub Actions CI | S | CC | 4 h |
| 1.19 | DigiLocker certificates, Bhashini (more Indian languages), DIKSHA export: **roadmap slide only** | C | – | – |

### Phase 2: Pilot-ready with NCPOR (4–6 weeks after SIH)
- **Hosting:**
  - Docker images; staging + production on a MeitY-empanelled cloud or NIC.
  - Infrastructure as code; secrets manager.
  - PITR backups plus a monthly restore drill.
  - CDN.
- **Workers:**
  - Durable queue (pgmq) with a dead-letter queue.
  - Video transcoding (ffmpeg → HLS).
  - ClamAV scanning; resumable large uploads.
- **Security:**
  - MFA for staff; confirm NIC Parichay SSO; role matrix.
  - CSP enforced; WAF.
  - OWASP ZAP and dependency / secret scanning in CI.
  - Key-rotation runbook.
  - Pen test by a **CERT-In-empanelled auditor** for a "safe to host" certificate (GIGW 3.0).
- **Compliance:**
  - GIGW 3.0 self-assessment, then STQC certification.
  - DPDP: notice, consent, retention, grievance officer, breach runbook including CERT-In incident reporting.
- **Accessibility:** manual audit (NVDA, TalkBack, keyboard only) and fixes.
- **AI:**
  - Paid tier with data-processing terms; per-day budget caps.
  - Test set run in CI.
  - Red-teaming: prompt injection in uploaded documents, child-safety for Ask.
  - A Hindi polar-terms glossary agreed with NCPOR.
  - Self-hosted embeddings / LLM option.
- **Content:**
  - Bulk import from ncpor.res.in archives.
  - NPDC metadata federation.
  - Metadata standards: Dublin Core, DataCite, GCMD keywords; DOIs.
- **Integrations:** official social accounts (OAuth app reviews, all free APIs), a self-hosted newsletter (listmonk, AGPL), Umami analytics.
- **Load test (k6):** 200 concurrent browsers at p95 < 500 ms and < 1% errors; Ask protected by cache and limits.
- **Observability:** OpenTelemetry, dashboards, alerts, on-call rota.
- **Documentation:** staff guide (EN/HI), admin runbooks, content style guide.

### Phase 3: Production launch (6–8 weeks, paced by audits)
- Security audit and fix cycle.
- GIGW/STQC certification.
- User acceptance testing with NCPOR's outreach team.
- Soft launch, then public launch.
- Maintenance model (support contract, SLA 99.5%, RPO ≤ 24 h, RTO ≤ 4 h).
- Handover and training.

### Phase 4: Scale
- 22 Indian languages via Bhashini.
- DigiLocker-issued certificates.
- DIKSHA lesson export.
- Offline PWA for schools with poor connectivity.
- 360° station tours.
- Citizen-science contributions.
- Reuse by other MoES institutes.

---

## 6. Timeline

| Phase | Work | Calendar (two agents + team) |
|---|---|---|
| 0 Stabilise | about 10 h | Day 1 |
| 1 SIH must-haves | about 45 h | Days 1–3 |
| 1 SIH should-haves | about 25 h | Days 3–5 |
| 2 Pilot | – | 4–6 weeks after SIH |
| 3 Production | – | +6–8 weeks (audits and certification set the pace) |

If time is short, stop after the **must-haves**. That's the 10/10 SIH demo; should-haves raise the ceiling for technical judges.

---

## 7. SIH demo plan (7 minutes)
1. **Problem (30 s):** NCPOR's knowledge is spread across PDFs, photos, videos and events; outreach posts are written by hand; students never see it.
2. **Public portal on the judges' phones (60 s, QR code):** globe → station → Hindi toggle → Ask Dhruv in Hindi with citations.
3. **Staff: upload a scanned Hindi PDF or paste a YouTube link (90 s):** bilingual summary, captions and chapters, linked to an expedition.
4. **Dissemination (60 s):** one click → blog + X + Instagram + LinkedIn + Telegram with a social card → a *different* user approves → it **appears live on the Telegram channel on the judges' phones**, and on `/news`.
5. **Education (60 s):** lesson generated from the same document → quiz → certificate with QR → verify.
6. **Impact (30 s):** dashboard plus a content-gap report: "the portal tells NCPOR what people ask that the archive can't answer yet".
7. **Architecture and trust (60 s):** India hosting, NPDC federation, maker-checker approval, audit log, GIGW / DPDP / CERT-In readiness, cost, roadmap.

**Backups:**
- a recorded video of the full flow
- pre-ingested copies of every live item
- cached Ask answers for the planned questions
- a phone hotspot and a second laptop running a production build

Never fall back to invented content.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Antigravity collides with the dev server again, or makes unverified claims | Dev guard (0.2); AG only gets UI tasks with acceptance criteria; CC verifies every claim with Playwright |
| Free-tier AI throttling during the demo (Gemini 429s, Voyage 3 RPM) | Open-source path (1.0: Ollama + bge-m3 on the demo laptop, no rate limits); cached answers; pre-ingested demo items |
| Judges probe claims ("was this reviewed by NCPOR?") | Phase 0 integrity fixes; every item shows source + licence + who approved it |
| Content verification takes longer than coding | Start 1.5 on day 1; CC drafts with source links, YOU verify |
| Data sovereignty question | India hosting, NPDC federation, swappable AI, only public content sent to external AI |
| Public demo URL abused | No public privileged logins, rate limits, DEMO_MODE, rotated keys |

---

## Appendix: evidence and side effects of this audit
- Crawl data, screenshots, axe output: `%TEMP%\claude\E--SIH\...\scratchpad\audit\out\`, plus `vitals.mjs` and `crawl.mjs`.
- Mobile vitals (slow 4G, 4x CPU, production build), LCP / TBT:
  - home 8.3 s / 6.0 s
  - gallery 9.9 s / 0.6 s
  - explore 5.0 s / 1.2 s
  - asset 4.5 s / 0.6 s
  - learn 3.9 s / 1.0 s
  - news 3.4 s / 0.6 s
  - ask 1.2 s / 0.5 s
- Side effects:
  - `.next` was rebuilt after the corruption.
  - `next build` added `.next-build/types/**/*.ts` to `tsconfig.json` `include` (harmless).
  - The asset view/download counters my test visits incremented were reset to 0.
  - The 3 view and 4 download analytics events from the audit remain; purge them with the other test events in 1.16.
