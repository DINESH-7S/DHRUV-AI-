# DHRUV: SIH prototype system design and win plan

**Problem statement:** SIH26063, *Integrated Polar Science Outreach, Knowledge Repository and Media Dissemination Portal* (MoES / NCPOR, Software, Smart Education).

**Goal (set 25 Sep 2026):** a worthy, working prototype that wins SIH. Production hardening is deferred. The audit and the production roadmap stay in [`PRODUCTION_PLAN.md`](PRODUCTION_PLAN.md).

**Rules that still apply:**
- **Open source and free.** Free hosted tiers only for the demo, and only behind an abstraction with an open-source path.
- **Real, credited content only.**
- **No unverifiable attributions.** Nothing may be attributed to NCPOR, PIB or MoES unless we can verify it.
- **Human approval.** A person approves everything before it is published.

---

## 1. What the problem statement needs

> "Develop a comprehensive outreach portal that **archives expedition reports, scientific datasets, publications, photographs, videos and institutional activities** while **generating content for websites and social media**."

### 1.1 Capabilities: every noun must be demoable

| The PS asks for | What judges must see working | Today | Task |
|---|---|---|---|
| Outreach portal | A bilingual public site on a phone: globe → station → content | ✅ | C1 (mobile speed) |
| Expedition reports | A report with EN/HI summaries, linked to its expedition | ✅ 11 sourced expedition pages (`/expeditions/<code>`: timeline, schematic route map, sources, linked items); NCPOR's own ISEA scientific reports (1st, 2nd, 3rd, 30th/South Pole) from its DSpace repository plus 4 annual reports, linked to their expeditions | A4 done |
| Scientific datasets | A dataset card with a preview chart, a citation and a source link | ✅ 7 datasets (5 NCPOR/NPDC, 2 NSIDC), each with a monthly chart and first rows computed at ingestion, licence and citation | C3 done |
| Publications | Citation-ready records (DOI, APA/BibTeX) | ✅ 7: 5 open-access CC BY papers with DOIs and NCPOR co-authors (found via OpenAlex) + 2 Dhruvika issues | C3 (Crossref autofill: roadmap) |
| Photographs | A credited gallery with AI captions and alt text | ✅ 23 photos (Commons, credited), incl. the 2010 South Pole expedition and Dakshin Gangotri 1984 | target 30 |
| **Videos** | A video page with EN/HI summaries, chapters and captions, searchable | ✅ 18 NCPOR videos on `/videos` and asset pages: Gemini-watched EN/HI summaries, chapters, timestamped search chunks; citations open the exact moment | A2 (VTT captions: use YouTube's own) |
| **Institutional activities** | Upcoming and past events, a calendar, a recap with media | ✅ 17 dated activities on `/events` and the home page, each with its NCPOR/PIB source and recordings; `.ics` for each event and for all | A3 (month calendar view: optional) |
| Content for websites | An AI-drafted article → approved → on `/news` and RSS | ✅ `/news` and `/news/rss.xml` (EN/HI) | – |
| **Content for social media** | Drafts per channel → approved → **actually posted** | 🟡 drafts + two-person approval; live Telegram posting waits for the team's bot token | A5 |
| "Integrated" | One search and one assistant across everything above | 🟡 weak Hindi recall | A6 |
| Smart Education (theme) | Lesson and quiz from archive content → certificate → verify | ✅ 4 lessons | B6 |

### 1.2 What judges check besides features

**Hindi and English everywhere.** This is a government portal norm.
- Today: public pages are fully bilingual (311 of 311 keys).

**Works on their phones.** They will scan a QR code.
- Today (26 Sep, production build, slow 4G + 4x CPU): LCP 1.3-2.2 s on most pages, home ~3 s before the latest hero fix. Cached server responses 30-100 ms.
- Task: C1.

**Trustworthy AI.** Answers cite sources, the AI refuses when unsure, and nothing goes out without human approval.
- Today: citations and maker-checker approval are built.
- Task: B3 adds the gap board.

**Real content, correctly credited.** NCPOR judges recognise their own material and will spot anything invented.

**Adoptable.** Judges will ask who runs it, what it costs, where it is hosted, and whether a small outreach team can operate it.

**Accessible** to WCAG 2.1 AA, as GIGW requires.
- Today: 0 automated axe violations on 21 pages in both languages.

### 1.3 The hidden requirement: content

The prototype is only as convincing as its archive. Targets before the finale:

| Content | Target |
|---|---|
| Reports linked to expeditions | ≥10 |
| Videos | ≥5 |
| Institutional activities | ≥10 |
| Datasets | ≥5 |
| Publications | ≥5 |
| Photos | ≥30 |
| Lessons | ≥8 |

**Every item needs** a source link, a licence and a credit.

**Where to find content:**
- public pages of NCPOR and NPDC
- PIB releases
- official YouTube channels (embed only, never download)
- open-licence material from Wikimedia Commons and NSIDC

**Checks:**
- Check each source's reuse terms.
- A teammate verifies every fact and every Hindi sentence.

---

## 2. The idea in one line

**Upload once. DHRUV catalogues it in English and Hindi and a second person approves it. It then becomes searchable knowledge, cited answers, website and social posts, and school lessons. Meanwhile the portal reports what people ask that the archive can't answer yet.**

```
Staff upload or link ─► AI catalogue (EN/HI) ─► approval (maker ≠ checker) ─► publish
                                                                                 │
       ┌───────────────────────┬──────────────────────┬──────────────────────────┤
       ▼                       ▼                      ▼                          ▼
 Website + RSS      Social + live Telegram    Ask Dhruv (cited)        Lessons + quizzes
       └───────────────────────┴──────────┬───────────┴──────────────────────────┘
                                          ▼
                 Insights: views, questions, unanswered gaps ──► back to staff
```

---

## 3. System design (prototype)

### 3.1 Architecture

```
 Public (phone, desktop)      NCPOR staff (editor, reviewer, admin)      Channels (Telegram, RSS, share links)
          │                                │                                      ▲
          ▼                                ▼                                      │
 ┌──────────────────────────── DHRUV web app · Next.js 15 · one codebase · EN/HI ─────────────────────────────┐
 │ Public portal  home + globe, Explore, asset pages, expeditions, stations, gallery, videos, events, news,   │
 │                Learn, Ask Dhruv, verify certificate, RSS                                                  │
 │ Staff console  upload / link, review, content studio, calendar, events, insights                          │
 │ API routes     ingest, chat, campaign, posts, publish, cron/publish-due, social cards, health            │
 └────────────────┬─────────────────────────────────┬────────────────────────────────────┬───────────────────┘
                  ▼                                 ▼                                    ▼
    AI layer (lib/ai, swappable)        Supabase: Postgres + pgvector          Free external services
    · Gemini free tier (demo default)   + full-text · Storage · Auth + RLS     · Telegram Bot API (publish)
    · Ollama, open source (sovereign)   · pg_cron (scheduled posts)            · Open-Meteo (live weather)
      qwen3:4b · gemma3:4b · bge-m3                                            · YouTube embeds (official videos)
                                                                                · NPDC links, Crossref (DOIs)
```

### 3.2 Components

| Layer | Choice | Open source? | Free tier used for the demo |
|---|---|---|---|
| Web app | Next.js 15, TypeScript, Tailwind v4, next-intl (EN/HI) | ✅ MIT | A free web host (for example Vercel Hobby). The open-source path is `next start` in Docker on any server |
| 3D globe | react-globe.gl, three.js | ✅ MIT | – |
| Database and search | Postgres with pgvector and full-text search (Supabase) | ✅ | Supabase free tier; self-hostable |
| Files | Supabase Storage: a private `archive` bucket and a public `public-media` bucket | ✅ | same |
| Auth and roles | Supabase Auth and row-level security. Roles: uploader, reviewer, admin | ✅ | same |
| Scheduler | pg_cron and pg_net inside Postgres | ✅ | same |
| AI, hosted | Gemini: reads PDFs, images and YouTube videos; EN/HI text | ❌ | **Yes**: Google AI Studio free tier |
| AI, open source | Ollama (MIT) with qwen3:4b (Apache-2.0), gemma3:4b (Gemma terms, open weights) and bge-m3 (MIT) | ✅ | – |
| Embeddings | Voyage free tier on the public URL; bge-m3 in sovereign mode | bge-m3 ✅ | **Yes**: Voyage free tier |
| Social cards | `next/og` (Satori) | ✅ | – |
| Publishing | Telegram Bot API; share links for X, LinkedIn, WhatsApp and Facebook; RSS | free APIs | – |
| Live data | Open-Meteo weather (CC BY 4.0, credited); suncalc for daylight | ✅ | Open-Meteo free API |
| Indian languages | **Bhashini** (MeitY's national language platform): translation into the 22 scheduled languages, speech-to-text, text-to-speech | Government service, free. Open-source path: AI4Bharat models (e.g. IndicTrans2, MIT) | **Yes**: Bhashini free API (the team has access) |

### 3.3 Data model: existing tables plus small additions

Everything publishable is an **asset**: `report`, `publication`, `dataset`, `photo`, `video`, `event` or `news`. One pipeline therefore gives every type AI cataloguing, search, Ask Dhruv, campaigns and lessons.

| Table | Exists today | Additions for the prototype |
|---|---|---|
| `assets` | ✅ type, EN/HI title and summary, licence, credit, source, status, station, expedition | – |
| `asset_chunks` | ✅ text, `embedding vector(1024)`, English tsvector | See the list after this table |
| `event_details` | – | New, one row per `event` asset: `starts_at`, `ends_at`, `venue`, `is_online`, `link` |
| `expeditions`, `stations` | ✅ (including `route_geojson`) | Verified dates plus `source_url` |
| `content_posts` | ✅ channel, body, status, reviewer, `scheduled_at` | `published_at`, `external_url`, a `telegram` channel |
| `chat_logs` | ✅ question, answer, cited IDs | `locale`, `top_score`, `answered`, which feed the content-gap board |
| `lessons`, `quizzes`, `quiz_attempts` | ✅ | A QR code on certificates |
| `audit_log`, `analytics_events`, `ai_jobs`, `profiles` | ✅ | – |

Additions to `asset_chunks`:
- **`page` and `start_s` / `end_s`:** a citation can then open the exact PDF page or video minute.
- **`embedding_local vector(1024)`:** holds bge-m3 vectors for sovereign mode.
- **A `simple`-config tsvector:** the current tsvector uses the `english` configuration, which never matches Hindi words. That is the cause of the weak Hindi search.

### 3.4 Key flows

**Ingest** (staff; about 30–90 s on Gemini)
1. A staff member uploads a PDF, image or CSV, or pastes a YouTube or DOI link. A licence is required.
2. The file is stored in the private `archive` bucket.
3. Text is extracted:
   - text-layer PDFs are read directly
   - scanned pages go through AI vision
   - Gemini watches YouTube videos
4. The AI catalogues the item:
   - EN/HI summaries
   - keywords
   - alt text
   - suggested station and expedition links, which staff confirm
5. The text is split into chunks and embedded for search, keeping page numbers or timestamps.
6. A **different person** approves the item.
7. The item is published and a campaign is suggested.

**Ask Dhruv** (public; about 4–5 s on Gemini)
1. The question arrives by text or voice, in English or Hindi.
2. Hybrid search (vector plus keyword) runs over published content and the station, expedition and event directory.
3. The AI answers only from numbered sources. Each citation opens the asset at the right page or video minute.
4. If nothing matches, it says so honestly.
5. Every question is logged with its score. Weak ones go to the content-gap board.

**Disseminate** (staff)
1. From an approved asset or event, drafts are generated for:
   - an article
   - X
   - LinkedIn
   - Instagram
   - Facebook
   - WhatsApp
   - Telegram

   Each draft follows its channel's rules. A social card image carries the credit line.
2. An editor edits the drafts, then a reviewer approves.
3. Approved drafts are scheduled on the calendar.
4. pg_cron runs the publish step on schedule:
   - Telegram gets the post live.
   - `/news` and RSS update.
   - Other channels get share links or an export pack, so no account keys are needed.
5. UTM links count the clicks.

**Educate**
1. A lesson and quiz are generated from an approved asset, for classes 6–8, 9–10 or 11–12, in English or Hindi.
2. A reviewer approves the lesson.
3. A student takes the quiz. It is graded on the server, so the answer key never reaches the browser.
4. The student receives a certificate with a QR code, which anyone can verify on a public page.

**Insights**
1. The dashboard shows views, searches, questions, lessons and certificates, split by language.
2. Its centrepiece is "What people ask that we can't answer yet". One click drafts an explainer from the nearest sources, and staff approve it.

### 3.5 AI design

**What the AI does:**
- catalogues uploads
- answers questions with citations
- drafts campaigns
- writes lessons and quizzes
- writes event announcements and recaps
- summarises videos, with chapters and captions

**Guardrails already built:**
- Structured output is validated with Zod, with one repair round.
- Answers come only from the sources supplied.
- No quotes from, or attributions to, named people or organisations.
- NCPOR is credited as the source only where that is true.
- Nothing reaches the public without human approval.
- Every AI step is recorded in the audit log.

**Which engine: measured on 25 Sep 2026**

| | Gemini free tier | Ollama on the team laptop (GTX 1650, 4 GB) |
|---|---|---|
| Ask Dhruv answer | 3.8 s EN, 5.4 s HI (audit) | **~24 s** with the 8-bit KV cache<br>(12 s to read a 2,000-token prompt at ~160 tok/s, then ~13 tok/s)<br>~31 s with default settings |
| Reads PDFs, images, YouTube | Yes | Text and images (gemma3:4b)<br>Scanned PDFs need OCR<br>No YouTube |
| Cost / API keys | Free tier / needs a key | Free / none |
| Does data leave NCPOR? | Yes | No |
| Limits | Free-tier limits: 503 "high demand" and 429 quota errors hit in testing before a retry succeeded | None, but one request at a time |
| Speed on real tasks (`npm run ai-compare`) | Ask 2.8–4.3 s<br>Catalogue 25 s (including retries)<br>Social posts 6.5 s | Ask 31–56 s<br>Catalogue 146 s<br>Social posts 39 s<br>(default settings, 8K context) |
| Quality on real tasks | Focused answers with citations<br>Correct Hindi<br>Good catalogue summary | Correct on the Hindi Maitri question<br>**Answered one Hindi question in English**<br>The English catalogue "summary" was only a title<br>**A draft post said Maitri was "established in 2017"** (the photo's year, not 1989); only human review would catch it |
| Cross-language search (bge-m3) | – | Works: a Hindi question scores 0.44 against the matching English text and 0.19 against unrelated text |

**Decision for the prototype:**
- **Gemini is the default demo engine.**
- **Ollama is "sovereign mode":** the same pipeline on open-source models, with no data leaving the building. It is shown in the pitch and used as the offline fallback on the laptop.

This updates the earlier advice to run the whole demo on Ollama. The goal is now a winning live demo. A 24–56 s answer is too slow on stage, and the small model's mistakes need a reviewer.

The "established in 2017" error is also a pitch asset: it shows live why every AI draft needs a second person's approval before publishing.

**Sovereign-mode fixes (task B5):**
- Check the answer language: if a Hindi question gets an English answer, retry with a stricter instruction.
- Keep sovereign mode to rehearsed questions on stage.
- Tell judges the answer: a larger open model on a server GPU at NCPOR or NIC closes the quality gap.

**Laptop setting** (measured +25% to +60% output speed):
1. Set the user environment variables `OLLAMA_FLASH_ATTENTION=1` and `OLLAMA_KV_CACHE_TYPE=q8_0`.
2. Restart Ollama.

Models can use only about 2.8 GB of this laptop's 4 GB of VRAM.

**Embeddings rule:** queries must use the same model that embedded the archive. The public URL uses the hosted embedding model; sovereign mode uses `embedding_local` (bge-m3).

### 3.6 Demo-grade speed and reliability

**Pages:**
- Public pages are static (ISR) and revalidate when something is published.
- The globe shows a poster image first and loads three.js when the browser is idle.
- Images come as responsive thumbnails.
- PDFs show first-page images instead of embedding the whole 19 MB file.

**Ask Dhruv fallbacks:**
- The planned demo questions have cached answers.
- If embeddings are rate-limited, Ask falls back to keyword search.
- If the internet fails, sovereign mode takes over.

**Demo data:**
- Every item used live also exists as a pre-ingested copy.
- The quick sign-in buttons (uploader and reviewer) appear only when `NEXT_PUBLIC_DEMO_MODE=true`.

**Backups:**
- a recorded video of the full flow
- a production build on a second laptop
- a phone hotspot

### 3.7 Deliberately not built now (roadmap slide only)

Details are in `PRODUCTION_PLAN.md`, phases 2–4:
- a durable job queue and worker (pgmq)
- an observability stack (GlitchTip, Uptime Kuma, Umami)
- bot protection
- CI and test-coverage targets
- a CERT-In audit and GIGW/STQC certification
- load tests
- deployment on NIC
- OAuth for official social accounts
- DigiLocker and DIKSHA

---

## 4. Signature innovations (all implementable on the current stack)

| # | Innovation | Why judges care | How | Tasks | Demo moment |
|---|---|---|---|---|---|
| 1 | **Publish once, reach everywhere** | NCPOR's outreach team is small; one upload becomes a week of content | Cataloguing, campaigns and maker-checker exist; add live Telegram, social cards, calendar, lesson link | A5, B6 | A post lands on the Telegram channel on the judges' phones seconds after approval |
| 2 | **Ask Dhruv with proof, by voice, in Hindi** | People ask in their own language, and every answer can be checked | Hybrid search and citations exist; add Bhashini speech-to-text and read-aloud, plus page/minute citations | A6, B1, B2 | A judge asks aloud in Hindi; the answer cites the exact minute of an official video |
| 3 | **"What India asks" content-gap board** | The portal tells NCPOR what to publish next: a feedback loop, not a brochure | Score in `chat_logs`, a board, a one-click explainer | B3 | Last week's unanswered questions → an explainer drafted in one click |
| 4 | **Live polar window** | Remote stations feel present; strong for schools | Open-Meteo and suncalc on the globe and station pages, credited | B4 | The live temperature at Maitri and the days until polar night ends, on the judges' phones |
| 5 | **Sovereign AI mode** | Government data stays in India, no vendor lock-in, no AI bill | Ollama path (built), bge-m3 column, a badge showing which engine answered | B5 | The same answer generated on this laptop with Wi-Fi off |
| 6 | **Classroom in one click** | The Smart Education theme | `lib/ai/lesson.ts` (exists) surfaced in the studio; teacher print view; QR certificates | B6 | Report → lesson for classes 9–10 → quiz → certificate → verified by QR |
| 7 | **Every Indian language** | Reach far beyond Hindi and English on India's own language platform (Digital India Bhashini), which a ministry jury values | Bhashini translation on demand for summaries, lessons and Ask answers; cached in the database; labelled as machine translation | B7 | A judge picks Tamil or Bengali and the lesson switches language live |

**Voice:** voice runs on Bhashini. The browser's built-in speech API is only the fallback, because it is a browser-vendor service rather than open source.

**Finale reserve:** 1–3 h each, built during the finale to show progress between jury rounds.
- Video captions in more Indian languages (Bhashini).
- A WhatsApp or email weekly digest.
- "This day in polar history" suggestions, built from verified dates.
- 3–4 h kept free for a judge's suggestion from the previous round.

---

## 5. Build plan

**Owners:**
- **CC:** Claude Code
- **AG:** Antigravity (UI only, verified by CC)
- **YOU:** the team

Hours are estimates.

### Sprint A: every noun in the PS works (must)
| # | Task | Owner | Est. |
|---|---|---|---|
| A1 | **Real content pack.** Videos, events, expedition dates, datasets, publications. Each item has a source, licence and credit; the Hindi is checked. **Round 1 done (26 Sep):** 18 videos, 17 events and 5 datasets in `content/`, waiting for the team's check in `content/CHECKLIST.md`. Next round: publications, reports, photos. | CC researches, YOU verify | 5 h |
| A2 | **Videos.** A YouTube link goes to Gemini, which produces EN/HI summaries, chapters, captions (VTT) and transcript chunks with timestamps. Plus a video page. **Done (26 Sep):** `npm run import-media`; click-to-load player; long recordings analysed for the first 30 min. | CC 6, AG 2 | 8 h |
| A3 | **Institutional activities.** `event` assets plus `event_details`; AI announcement and recap; upcoming/past lists, a month calendar, `.ics` download. **Done (26 Sep):** event details live in `assets.ai_metadata.event` (no migration needed); upcoming/past by year; home page section. Still open: AI recap, calendar, `.ics`. **Also done (26 Sep):** `.ics` per event and for all activities. | CC 4, AG 2 | 6 h |
| A4 | **Expeditions.** A detail page with a timeline, linked assets (AI suggests, staff confirm) and a route on the globe labelled as schematic. **Done (26 Sep):** 11 sourced expeditions (`content/expeditions.json`, `npm run import-expeditions`), timeline, schematic route map, linked items; unsourced seed records hidden. | CC 3, AG 2 | 5 h |
| A5 | **Dissemination.** A live Telegram adapter; share links and an export pack; social cards with credits; `/admin/calendar` with pg_cron; RSS; UTM click counts. **Partly done (26 Sep):** RSS. Telegram waits for the bot token. | CC 7, AG 3 | 10 h |
| A6 | **Ask and search.** The directory (stations, expeditions, events, lessons) becomes a source; a Hindi name glossary; a `simple` tsvector and hybrid search in Explore; a 20-question EN/HI test set. **Done (27 Sep):** sourced expedition timelines are an Ask Dhruv source; the test set is 32 questions (26 facts, 6 outside the archive) in `content/eval/questions.json`, run with `npm run eval-ask`, published at `/accuracy`. | CC 5, YOU 1 | 6 h |
| A7 | **Deploy.** Free host plus a QR code; demo accounts behind DEMO_MODE; a smoke test on the live URL; run migration 05. | CC 2, YOU 1 | 3 h |

### Sprint B: signature innovations (should; the biggest demo value)
| # | Task | Owner | Est. |
|---|---|---|---|
| B1 | Voice questions and read-aloud answers through Bhashini (speech-to-text and text-to-speech), with the browser's speech API as a fallback | CC | 4 h |
| B2 | Citations that open the exact PDF page or video minute **Done (27 Sep):** every passage of the 10 text PDFs carries its page (`npm run pdf-pages`); 4 scanned PDFs have AI-located section pages (`npm run scanned-pages`; the South Pole report was skipped because the pages came back out of order). New uploads get pages automatically. | CC | 3 h |
| B3 | Content-gap board and one-click explainer **Done (26 Sep):** `/admin/insights`; briefs plan an explainer and state no facts. | CC 3, AG 1 | 4 h |
| B4 | Live polar window (Open-Meteo, suncalc) **Done (26 Sep):** home page and station pages; credited, labelled as model data. | CC 2, AG 1 | 3 h |
| B5 | **Sovereign mode.** bge-m3 column and re-embedding, engine badge, the 8-bit KV setting, an answer-language check with retry, a quality check against the test set. **Engine badge done (26 Sep).** | CC | 5 h |
| B6 | **Classroom in one click.** Lesson from any asset in the studio, teacher print view, QR on certificates, ≥4 more lessons. **QR on certificates done (26 Sep).** | CC 3, YOU 1 | 4 h |
| B7 | **Every Indian language.** A `lib/lang/bhashini.ts` adapter; a "Read in your language" option on assets, lessons and Ask answers. Translations are cached in the database and labelled as machine translation. A glossary keeps station names correct (मैत्री, भारती, हिमाद्रि, हिमांश). | CC 4, AG 1 | 5 h |

### Sprint C: polish for judges (should)
| # | Task | Owner | Est. |
|---|---|---|---|
| C1 | **Mobile speed.** Globe poster with deferred three.js, compressed textures, responsive thumbnails, PDF first-page images, static pages. **Partly done (26 Sep):** page fades and scroll reveals moved from JavaScript to CSS (content no longer hidden until hydration), public queries cached 60 s with instant refresh on staff changes. Still open: globe poster, smaller photo thumbnails. **Globe poster done (26 Sep):** 37 KB still, three.js loads when idle. | CC | 6 h |
| C2 | Admin pages redesigned on the design system, with real dashboard numbers | AG 8, CC 2 | 10 h |
| C3 | **Datasets and publications.** Datasets: CSV preview and chart, "cite this", schema.org Dataset, NPDC link. Publications: DOI → Crossref autofill. **Datasets done (26 Sep):** monthly chart and first rows; 5 CC BY publications with DOIs. | CC 5, AG 1 | 6 h |
| C4 | **Trust pages in EN/HI.** About with the prototype disclaimer, privacy, accessibility statement, AI and content policy. **Done (26 Sep):** /about, /privacy, /accessibility, /ai-policy in EN/HI, linked from the footer. | AG | 2 h |
| C5 | **Pitch.** Idea deck on the official template, demo script, backup video, Q&A drill. | CC 4, YOU 4 | 8 h |

**Totals:** Sprint A about 43 h, Sprint B about 28 h, Sprint C about 32 h.

**If time is short,** build this winning core: all of Sprint A, B1–B4, B7, C1 and C5.

**Definition of done (prototype level):**
- Works on the deployed URL on a phone, in English and Hindi.
- No console errors.
- No invented or uncredited content.
- The Playwright smoke test passes.

---

## 6. How to win

### 6.1 Stage by stage

**1. Idea submission (college → SIH portal).** The ministry shortlists finalists from the idea decks on the official SIH template, so the deck is the first gate. What sets a deck apart:
- **Real screenshots.** Show the working prototype; most teams submit mock-ups.
- **The one-line idea** and the loop diagram.
- **NCPOR-specific detail:** Maitri, Bharati, Himadri, Himansh, NPDC.
- **A feasibility slide:** open source, ₹0 in licences, runs on NIC.
- **Measurable impact.**
- **The live URL and a QR code,** if the template allows.

**2. Before the finale.**
- Finish Sprints A and B and load real content.
- Rehearse the demo ten times.
- Record the backup video.

**3. Grand finale (several jury rounds).**
- Show new progress in every round, using the finale reserve.
- Build at least one judge's suggestion between rounds, and say so.
- Make sure every teammate can explain the architecture and their own part; juries often question individual members.

### 6.2 Demo script (about 6 minutes)

| Time | Show | Wow moment |
|---|---|---|
| 0:00 | The problem in NCPOR's terms: scattered PDFs, photos, videos and events; posts written by hand; students never see it | – |
| 0:30 | Judges scan the QR code: globe → Maitri with live weather → switch to Hindi | Live, real data on their own phones |
| 1:15 | Ask Dhruv by voice, in Hindi (Bhashini speech-to-text). The answer has citations and is read aloud; open the cited video at the exact minute | Proof, not just an answer |
| 2:15 | Staff paste an official YouTube link or upload a report. EN/HI catalogue in seconds; a reviewer approves | AI drafts, humans decide |
| 3:15 | One click produces an article, X, LinkedIn, Instagram and Telegram drafts plus a social card. A second person approves, and the post appears on the Telegram channel on the judges' phones | Real dissemination |
| 4:15 | A lesson and quiz from the same report; a judge switches it to Tamil or Bengali (Bhashini) → certificate with a QR code → verify | Smart Education in any Indian language |
| 5:00 | Insights: what people asked that the archive can't answer → a one-click explainer | The portal learns what to publish |
| 5:30 | Trust and sovereignty: maker-checker, audit log, credits. Then the same answer from open-source models on this laptop, offline | No lock-in; data stays in India |
| 6:00 | Impact and roadmap: NIC hosting, DigiLocker, DIKSHA | – |

### 6.3 Questions judges will ask

| Question | Answer |
|---|---|
| What if the AI is wrong? | It answers only from the archive and cites every claim. If nothing matches, it says so. Nothing is published without a second person's approval, and every AI step is in the audit log. |
| Does our data go to a foreign AI? | In the demo, only public outreach material goes to the hosted model. The same pipeline runs on open-source models on NCPOR or NIC hardware, and we show it live. |
| What does it cost? | ₹0 in licences, because every component is open source. It runs on one server; the AI runs on one GPU or on a free tier. |
| How is this different from our website? | One upload feeds search, a bilingual assistant, social posts, lessons and analytics, with approval and credits built in. |
| What about copyright of photos and videos? | A licence is mandatory at upload. Credits appear on every page and are printed on social cards. Videos are embedded from official channels, not copied. |
| Can our staff use it without training? | It takes three steps: upload, check the AI draft, approve. The console is bilingual. |
| Why not just NPDC? | NPDC stays the system of record for raw data. DHRUV is the outreach front door that links to it. |
| Will it scale? | Public pages are static and cacheable, and Postgres holds the archive. Heavy AI work can move to a queue and worker (roadmap). |
| Is it secure? | Row-level security, role-based access, maker-checker approval, security headers and CSP, no public admin sign-ins. Next steps: a CERT-In audit and NIC Parichay SSO. |
| Does it meet accessibility and GIGW rules? | WCAG 2.1 AA: 0 automated violations on 21 pages in both languages, and captions on videos. STQC certification is on the roadmap. |

### 6.4 Team roles (adjust to your team)

| Role | Owns |
|---|---|
| Demo lead | Drives the laptop; knows every flow cold |
| Pitch lead | Story, deck, timing |
| AI and backend | AI, data and security questions |
| Frontend | UX, accessibility, mobile |
| Content and Hindi | Verifies every fact, credit and Hindi sentence |
| QA and operations | Phone testing, backups, hotspot, clean demo data |

### 6.5 Mistakes that lose SIH

- Building features the PS never asked for while a PS noun (videos, events) is still missing.
- A live demo with no backup, or one that depends on venue Wi-Fi.
- Placeholder or invented content. NCPOR judges recognise their own material.
- Showing slides instead of the product, or reading from slides.
- A teammate who can't explain their part.
- No answer to "how would NCPOR run this, at what cost, and where is it hosted?"
- English-only screens, or untrue claims such as "NCPOR-approved".

---

## 7. Decisions log

| Date | Decision |
|---|---|
| 25 Sep 2026 | The goal changed from production to a winning prototype. Production phases are deferred to `PRODUCTION_PLAN.md`. |
| 25 Sep 2026 | The Gemini free tier is the default demo engine. Ollama is sovereign mode and the offline fallback. Measurements are in §3.5. |
| 25 Sep 2026 | Ollama laptop setting: flash attention and the 8-bit KV cache. |
| 25 Sep 2026 | Events are assets of type `event` with an `event_details` table, so they reuse the whole pipeline. |
| 25 Sep 2026 | The team has Bhashini API access, so Bhashini moves from the roadmap into the build (B1 voice, B7 translation). The keys live only in `.env.local` and the host's environment settings. |
| 26 Sep 2026 | Videos and events are stored as assets with their source details in `ai_metadata.video` / `ai_metadata.event`, so no database migration is needed. Gemini watches each YouTube video (free tier, low resolution, 1 frame per 4 s); other providers fall back to title and description. |
| 26 Sep 2026 | Round 2 (no external keys needed): expedition pages from `content/expeditions.json` (facts stored in `expeditions.route_geojson.dhruv`, no migration; only sourced expeditions are public); live polar window (Open-Meteo + SunCalc, server-rendered); "What India asks" gap board with AI content briefs that state no facts; QR on certificates; engine badge on Ask answers; globe poster with three.js loaded when idle; trust pages; RSS and .ics; dataset previews. |
| 26 Sep 2026 | Truthful review labels: an item shows "approved by DHRUV staff" only when a signed-in reviewer published or checked it (audit log). Items loaded by import scripts say "not yet checked"; reviewers clear them from Admin → Review queue. The home stat "100% human-reviewed" was replaced by the number of sourced expeditions. |
| 26 Sep 2026 | Content sources for A1: videos are embedded from NCPOR's official YouTube channel (@NCPORGoaVasco, linked from ncpor.res.in); events come from NCPOR news items and PIB releases; datasets are NCPOR's own station data from data.ncpor.res.in, used under the NPDC data policy (open after lock-in, with acknowledgement). Content metadata lives in `content/` (in git); downloaded files stay in `seed-content/` (not in git). |
| 26 Sep 2026 | **Scope to the idea-submission deadline (30 Sep 2026, SIH portal, uploaded by the team leader).** Before the deck: (6) accuracy scorecard, (7) PDF-page citations, (1) the archive fills itself (NCPOR YouTube feed, ncpor.res.in news RSS, DSpace OAI-PMH, PIB RSS filtered by keyword), (5) verify a post by QR. Deck from 28 Sep with real screenshots. After 30 Sep, before the finale: (3) NCERT classroom mode, (4) monthly impact report, (8) demo safety net, (9) Dakshin Gangotri postcard, (11) this day in polar history. Not now: field-to-public via Telegram (waits for the token), kiosk mode. Pitch story: both an outreach engine for NCPOR staff and a portal for students and the public. Offline sovereign mode is shown as a recorded clip with measured numbers, not live. Keys (Vercel, Telegram, Bhashini) arrive on the user's command; commit after that step. |
| 27 Sep 2026 | **Accuracy scorecard results** (Gemini free tier): baseline 21/26 facts correct with the right source, 6/6 honest "not in the archive", 32/32 right language; after adding the expedition timelines 26/26, 5/6, 32/32, median 3.8 s. The one failure (a Moon question answered sensibly from the archive rather than refused) is left as a fail rather than changing the test. Voyage's free tier allows ~3 embedding requests a minute; beyond that Ask Dhruv falls back to keyword search, which still answered correctly. |
| 27 Sep 2026 | **Design language:** DHRUV follows its own `DESIGN.md`, structured on the SpaceX-inspired analysis from VoltAgent/awesome-design-md (near-black canvas, full-bleed real photography, uppercase Rajdhani display, hairlines, one ghost pill CTA per band), keeping DHRUV's navy tint and glacier accent. Rajdhani replaces Eczar because it covers Devanagari; Hindi is never uppercased or tracked. The home hero is the credited 2010 South Pole expedition photo (Thamban Meloth, CC BY-SA 4.0, toned). |
| 27 Sep 2026 | **Design language across the whole site** (DESIGN.md): every public page opens with a credited archive photo band or the polar graticule; home adds a station coordinate ticker and a pinned 1981-2026 expedition timeline; footer wordmark and graticule; 475 legacy slate/cyan classes moved to DHRUV tokens (staff pages included); gradient buttons replaced by solid pills. Checks: 28/28 Playwright tests, `npm run a11y` 0 WCAG 2.1 AA violations on 15 pages in EN and HI. |
| 27 Sep 2026 | **Ask Dhruv, staff console and globe upgraded.** Ask Dhruv: full-page opening with the real accuracy score, progressive answer reveal, inline citation chips linked to numbered source cards (page / video minute), real pipeline stages while waiting, Copy and Ask again; the fake model/effort/attachment controls (ignored by the API) were removed. Staff dashboard: server-rendered from live data (published, waiting for review, not yet checked by a person, questions per day in IST, archive coverage by decade, AI pipeline jobs, unanswered questions, audit log, accuracy ring), grouped sidebar with animated marker. Globe: NASA Blue Marble day and city-lights night blended along the real terminator from the sun's position (NOAA equations, `lib/live/sun.ts`), HTML station markers with live Open-Meteo temperatures, lighter textures (197 KB total vs 715 KB). Headlines rise word by word (CSS). Checks: 29/29 tests incl. live AI, axe 0 violations on 15 public + 3 staff pages. |
| 27 Sep 2026 | **Flagship pass: measured and optimised** (`npm run vitals`: budget phone, 4x CPU, 4G). Home blocking time 2,739 → 632 ms and JS 818 → 253 KB (globe loads only when scrolled near); Explore JS 358 → 248 KB and blocking 1,143 → 475 ms (search via `/api/explore`, no database client in the browser; 24 results per "Show more" instead of an 80-card page); layout shift 0.000 on all pages (was 0.273 Explore, 0.810 Ask, 0.218 Learn); sideways scrolling fixed on 3 pages (default shrinkable grid column); Lenis smooth scroll only on mouse/trackpad devices. Sign-in split screen with the expedition photo, polar-grid 404, reading progress on lessons, globe fitted for phones. LCP 1.1-2.2 s everywhere. 29/29 tests, 0 accessibility violations. |

| 27 Sep 2026 | **Pitch reframed and three features added before the deck.** Pitch order: (1) it already works, with NCPOR's own content (live link + QR on slide 1); (2) upload once, get everything; (3) the AI shows its sources and is tested; students (Smart Education) on the impact slide; offline mode and self-harvesting move to the roadmap slide. Built: **safe live link** — the 5 sample questions have saved real answers (`npm run save-answers`, `content/ask/saved.json`, 20 answers EN/HI) served instantly and labelled "Saved answer · model · date" with an "Ask the live AI" button; any AI failure shows a plain bilingual message plus the samples; with `NEXT_PUBLIC_DEMO_MODE=true` every seeded account, which shares the published demo password, is look-only (middleware refuses staff API writes, uploads refused, notice in the staff workspace; `DEMO_ALLOW_WRITES=true` for the team's own demo). **Upload once, get everything** (`/admin/pack`): one upload's outputs read live from the database (NCPOR Annual Report 2024-25: 11 outputs — EN/HI summaries, public page, 20 page-cited passages, website article, press release, X/Instagram/LinkedIn/Facebook drafts EN+HI, lesson + quiz), a drawn rail, catalogue time (51 s), and the audit log with who did each step ("No name recorded" for dev-session steps, never invented). **QR check on approved posts:** `/verify/post/<8-char code>` says Genuine / Not approved / No match and shows the exact approved text; staff get the QR, link and a 1080×1350 share card (EN/HI) in Studio and Review; Telegram posts end with the check link; `/verify` takes certificate IDs and post codes. The 8 new social drafts wait for a person to approve them. Checks: new smoke tests pass (saved answer, post check), axe 0 violations on the new pages in EN/HI, no sideways scroll at 390 px. |
