# Rubric

**Review PRs by answering questions, not reading diffs.**

Live: https://rubric-216.web.app
Built for the Scrunch AI product engineer take-home, April 2026.

---

## Why

Every AI PR review tool (CodeRabbit, Greptile, Diamond, Qodo, BugBot, Claude Code Review) solves the problem the same way: AI reads the code, AI generates comments, human reads comments. They compete on who writes the best comments. Research suggests only about 15% of those comments flag real defects, and industry PR review time is up 91% with AI adoption. Reviewers are drowning in information, not starved of it.

Rubric inverts the interaction. Instead of AI commenting at the code for a human to read, Rubric generates a short rubric of yes/no **decision questions** for the human to answer. The reviewer never reads the full diff unless they choose to. They answer. They decide.

This is Perspective-Based Reading (Laitenberger & DeBaud, 1997) productized: a 30-year-old academic approach that finds defects roughly 8x faster than ad-hoc review.

## How it works

A review is a four-phase linear flow:

1. **Brief.** One-sentence summary of what the PR does, a 2-4 item list of functional areas touched, and a risk signal. ~10 seconds to get oriented.
2. **Rubric.** 3 to 7 decision questions generated from the diff. Each question ships with the specific slice of the diff it is asking about, rendered inline as a color-coded unified diff. Reviewer answers yes / no / unsure per card.
3. **Ask.** Optional chat. Reviewer asks anything about the PR; answers quote the diff verbatim via a fabrication-guarded reference check. Skippable at any time.
4. **Decide.** Reviewer picks Approve / Request changes / Unsure. The tool does not recommend. Copying to clipboard produces a ready-to-paste PR comment that includes the brief, every Q&A, the chat log, and the reviewer's decision.

The home screen auto-loads open PRs from this repo. You can review Rubric with Rubric.

## The fabrication guard

Every embedded code snippet (rubric `codeContext` and Ask `codeReferences`) is substring-verified against the raw PR diff after the LLM produces it. Any snippet containing a line that does not appear in the actual GitHub diff is dropped silently before the reviewer sees anything. This is enforced in code, not left to the prompt. A tool that hallucinates evidence is not a tool anyone can trust with merge decisions.

## Architecture

- **Frontend.** React 19 + Vite + TypeScript, Tailwind v3. No router library (URL params for routing). No global state library (useState + URL only). Three screens plus Home, linear navigation.
- **Backend.** Firebase Functions v2 (Node 20) with Genkit. Four flows: `generateBrief`, `generateRubric`, `answerPRQuestion`, plus a plain `listPRs` HTTPS endpoint. Every flow uses `ai.defineFlow` with Zod-validated input and output; deterministic multi-phase orchestration; no regex parsing of LLM output.
- **Model.** Vertex AI Gemini 2.5 Flash-lite. Model reference lives as a single constant in `functions/src/genkit.ts` so swapping to Flash or Pro is a one-line change.
- **GitHub.** Unauthenticated public REST API. 60 req/hr is sufficient for the demo; an optional `GITHUB_TOKEN` env var bumps it to 5000/hr.
- **Deploy.** Firebase Hosting for the frontend, Cloud Functions (Gen 2) for the backend, single project (`rubric-216`).

## What was cut

Explicit non-goals to stay inside the 2-3 hour build window:

- User auth, accounts, multi-reviewer flows
- Firestore or any persistence (review state lives in React state + URL params)
- Posting the review comment back to GitHub (copy-to-clipboard is the v1 substitute)
- Private repo support, PAT handling, OAuth
- Dark mode, swipe gestures, analytics, streaming AI responses

The cuts were the point. One core flow done well beats three flows done halfway.

## Local dev

```bash
# Backend — test a flow against a real PR
cd functions
npm install
npm run build
npx tsx src/dev/testGenerateRubric.ts samflipppy rubric 3

# Frontend — local dev pointed at the deployed Functions URL
cd web
cp .env.example .env   # VITE_FUNCTIONS_URL, VITE_DEFAULT_OWNER, VITE_DEFAULT_REPO
npm install
npm run dev            # http://localhost:5173

# Deploy
firebase deploy --only functions,hosting
```

Vertex AI authentication uses Application Default Credentials. Run `gcloud auth application-default login` once for local dev. Deployed Functions use the default compute service account, which needs `roles/aiplatform.user` on the project.

## Repo layout

```
functions/src/
├── genkit.ts                  # ai instance + model constant
├── schemas/                   # Zod schemas (pr, rubric, review, brief, ask)
├── tools/github.ts            # GitHub fetch tool + plain helpers
├── flows/
│   ├── generateBrief.ts
│   ├── generateRubric.ts
│   └── answerPRQuestion.ts
└── index.ts                   # onCallGenkit exports

web/src/
├── pages/                     # Home, Brief, Review, Ask, Decide
├── components/                # QuestionCard, DiffView, TierBadge, ProgressBar, LoadingSequence
├── lib/                       # api, nav, github URL parser, audit-trail assembly
└── types.ts
```

See [PRD.md](./PRD.md) for the full product spec and [UI.md](./UI.md) for the design system and screen layouts.
