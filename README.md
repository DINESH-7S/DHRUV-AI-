# DHRUV · Polar Knowledge Repository for India

**Smart India Hackathon 2026 · Problem statement SIH26063**
*Integrated Polar Science Outreach, Knowledge Repository and Media Dissemination Portal* (Ministry of Earth Sciences / NCPOR · Smart Education)

![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs) ![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20pgvector-3ECF8E?logo=supabase&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white) ![Languages](https://img.shields.io/badge/UI-English%20%7C%20हिन्दी-5bbfe6) ![Licence](https://img.shields.io/badge/code-MIT-lightgrey)

> DHRUV is a student prototype. It is **not** an official website of NCPOR, the Ministry of Earth Sciences or the Government of India. Every document, photo, video and dataset is credited to its owner on its own page.

---

## Why we built this

India has been sending expeditions to Antarctica since 1981, and to the Arctic and the Himalaya since. The results are spread across PDFs, annual reports, YouTube videos, press releases and data portals. Most of it is in English, and much of it is hard to find.

NCPOR's outreach team is small. Turning one 170-page annual report into a news article, a press release, social posts in two languages and something a Class 7 student can learn from takes days.

DHRUV does that work in minutes. People still make every decision.

## What it does

**Upload once, get everything.** A scientist uploads a report, dataset, photo or video. DHRUV's AI reads it and makes:

- an English and a Hindi summary, keywords and alt text
- a public archive page with preview, download, citation and licence
- searchable passages, each tagged with its PDF page
- a website article and a press release
- posts for X, Instagram, LinkedIn and Facebook, in English and Hindi
- a lesson for students, with a quiz and a certificate that can be verified

Our real example: **NCPOR's Annual Report 2024-25** (19 MB, 170 pages) became 11 outputs. The AI catalogue was ready in 51 seconds.

**Nothing goes out without a person.** Every post needs a second staff member to approve it, and whoever made a draft can't approve it. Every step is written to an audit log with the name of the person who took it.

**Ask Dhruv shows its sources.** Anyone can ask a question in English or Hindi. Each answer cites its sources, down to the exact PDF page or the minute in a video. If the archive doesn't hold the answer, Dhruv says so instead of guessing.

**Tested in public.** We test Ask Dhruv against 32 fixed questions whose answers we checked by hand. The latest run got **26 of 26 facts right, with the right source**, and 5 of 6 honest "I don't know" answers. The failure is shown too. See `/accuracy`.

**Anyone can check a post.** Every approved post carries a QR code. Scanning it opens DHRUV and shows *Genuine*, *Not approved* or *No match*, with the exact approved text. A post edited after approval is easy to spot.

**Built for everyone.** The site is fully bilingual (English and Hindi, 511 interface texts in each) and designed for phones first. Automated WCAG 2.1 AA checks find 0 accessibility violations. Pages load in 1 to 2.3 seconds on a budget phone over 4G.

## A quick tour

| Page | What you'll see |
|---|---|
| `/` | Live globe with India's stations (Maitri, Bharati, Himadri, Himansh) and their current temperatures, plus a timeline of expeditions from 1981 to today |
| `/explore` | The whole archive: reports, papers, datasets, photos, videos, activities |
| `/ask` | Ask Dhruv, with sample questions that always answer instantly |
| `/expeditions` | Sourced expedition pages with timelines and route maps |
| `/learn` | Lessons, quizzes and certificates |
| `/accuracy` | The public scorecard for Ask Dhruv |
| `/verify` | Check a certificate or a post's QR code |
| `/admin/pack` | Staff view: one upload and everything it became |

## How it's built

```
Browser (Next.js 15, React, Tailwind v4, framer-motion, three.js globe)
   │
   ├── Public pages ──────────── Supabase Postgres (row-level security: public sees published items only)
   │                              ├── pgvector + full-text hybrid search
   ├── /api/chat (Ask Dhruv) ──── └── audit log, approval state machine
   │        │
   │        └── LLM (Gemini free tier, or Ollama on our own machine) + embeddings (Voyage or bge-m3)
   │
   └── /admin (staff) ─────────── upload → AI catalogue → drafts → second-person approval → publish
```

- **Open source and free to run.** Next.js, Postgres + pgvector and Supabase (which can be self-hosted) are all open source. The AI is swappable: the demo uses free hosted tiers, and a fully offline mode runs open-weight models (Gemma, Qwen, bge-m3) through Ollama on a normal laptop.
- **Honest data.** Items loaded by import scripts say "not yet checked by a person" until a reviewer checks them. We never show approvals that didn't happen.

More detail: [`SIH_PLAN.md`](SIH_PLAN.md) (design and decisions), [`SPEC.md`](SPEC.md) (data model and APIs), [`DESIGN.md`](DESIGN.md) (visual language), [`PRODUCTION_PLAN.md`](PRODUCTION_PLAN.md) (what a real deployment would still need).

## Run it yourself

You need **Node.js 20+** and a free **Supabase** project.

```powershell
git clone https://github.com/DINESH-7S/Polar-Knowledge-Repository-FOR-INDIA-SIH-2026.git
cd Polar-Knowledge-Repository-FOR-INDIA-SIH-2026
npm install
Copy-Item .env.example .env.local   # then fill in your own keys
npm run dev                         # http://localhost:3000
```

Then run the SQL files in `supabase/migrations/` in the Supabase SQL editor, oldest first, and `npm run seed` for the reference data and demo accounts.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run test:e2e` | Playwright tests in English and Hindi, desktop and phone |
| `npm run a11y` | Accessibility audit (axe-core, WCAG 2.1 AA) |
| `npm run vitals` | Loading speed on a simulated budget phone |
| `npm run eval-ask` | Runs the 32-question accuracy test for Ask Dhruv |
| `npm run save-answers` | Refreshes the saved answers for the sample questions |

## What's next

- Asking by voice in Indian languages, through Bhashini
- Approved posts going live on NCPOR's channels automatically
- New NCPOR videos and news collected into the archive by themselves
- A classroom mode for teachers, and a monthly impact report for NCPOR

## Credits and licence

The **code** is under the [MIT licence](LICENSE). Archive **content** is not: each document, photo, video and dataset keeps its owner's licence, which is shown on its page. Sources include NCPOR's own repository, website and YouTube channel, PIB, Wikimedia Commons contributors, NSIDC and NASA (Blue Marble imagery).

Built by a student team for Smart India Hackathon 2026.
