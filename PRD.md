# Rubric — Product Requirements Document

**Status:** v1 spec for the Scrunch AI take-home build
**Author:** Flip (216LABS)
**Target build time:** 2-3 hours
**Stack:** Firebase Functions v2, Genkit, Gemini, React (Vite), Firebase Hosting

---

## 1. Thesis

PR review is broken for the AI era. Every existing tool (CodeRabbit, Greptile, Graphite/Diamond, Qodo, BugBot, Claude Code Review) solves the same problem the same way: AI reads the code, AI generates comments, human reads comments. They compete on who has the best comments.

But reviewers are drowning in information, not starved of it. PR review time is up 91% with AI adoption, code churn is up, and engineers describe themselves as "judges at an endless assembly line." Only 15% of current review comments flag real defects. The paradigm is broken.

Rubric inverts the interaction. Instead of AI commenting AT the code for a human to read, Rubric generates 5 to 12 yes/no questions FOR the human to answer. The reviewer never reads the diff unless they choose to. They answer the questions. Rubric returns a verdict.

This is not a novel metaphor. It is 20 years of research finally productized:

- **Industry best practice:** Google's engineering guidelines, Microsoft's Code-with-Engineering Playbook, and every major code review checklist recommend question-driven review. "Ask questions, don't make demands" is the phrase.
- **Behavior Driven Development:** Given-When-Then scenarios have been the accepted format for reasoning about code behavior since 2003. BDD does it at design time. Rubric does it at review time.
- **Perspective-Based Reading (Laitenberger and DeBaud, 1997):** Academic research shows question-driven review finds defects 8x faster than ad-hoc review (2 min vs 17 min in a 2024 study).
- **Ensemble-learning theory ("Specification as Quality Gate," arxiv 2026):** When AI generates code and AI reviews code from the same model family, they share blind spots. The only way to escape is a human-provided external oracle. Rubric makes the human the oracle, efficiently.

The product category is new: **review-as-decision-session**, not review-as-comment-stream.

## 2. One-line pitch

Rubric reads your PR and asks you 5 to 12 questions. You answer yes or no. It tells you whether to merge.

## 3. Users and use case

The take-home user is a reviewer on a repo who wants to review an open PR without reading the full diff. For the demo, this is the Scrunch AI interviewer loading Rubric's own repo and reviewing one of Rubric's own PRs. Self-referential demo is the core narrative hook.

## 4. Core user flow

The entire v1 flow is three screens.

**Home screen**
- Default state: auto-loads the list of open PRs from a hardcoded repo (Rubric's own repo)
- Alternate: paste any public GitHub PR URL
- Click a PR to start a review

**Review screen**
- One question card visible at a time
- Question in plain English, with a one-line rationale for why this question matters
- Three actions: Yes / No / Show me the code
- "Show me the code" expands a code snippet contextualizing the question
- Progress bar at the top (e.g., "3 of 8")
- Questions are ordered by tier: intent first, then behavioral, then invariant

**Verdict screen**
- Headline recommendation: Approve, Request Changes, or Needs Human Review
- Short summary of why, generated from the reviewer's answers
- List of concerns flagged by "no" or "unsure" answers
- Copy-to-clipboard button for the structured review comment (the audit trail)

Target: a reviewer completes a full review in under 2 minutes.

## 5. Question tiers

Questions are generated in three tiers. The AI produces a mix, weighted by PR size and risk.

**Intent (2 to 4 questions)**
Detects scope creep and AI drift. These are the most important because AI agents frequently bundle in changes not requested.

Examples:
- "The PR description says this adds password reset. Are all changes in this PR related to password reset?"
- "This PR modifies 3 files outside `/auth/`. Is this expected?"

**Behavioral (3 to 6 questions)**
Given-When-Then scenarios derived from the actual code changes. This is the core of the product.

Examples:
- "When a user with an expired session token hits `/refresh`, should they be logged out?"
- "If the `email` field is null during signup, should the current behavior be to throw a 400?"

**Invariant (2 to 4 questions)**
Catches the AI-specific failure modes documented in the research (silent failures, happy-path bias, convention drift, swallowed exceptions, N+1 queries).

Examples:
- "This PR adds a database query inside a loop over `users`. Is this intentional?"
- "Error handling on line 47 swallows the exception silently. Is that desired?"

## 6. v1 scope

**In scope for the 2-3 hour build**

- Fetch open PRs from a hardcoded public GitHub repo
- Fetch PR details and file diffs via public GitHub API (unauthenticated, 60 req/hr is fine for demo)
- Support pasting any public GitHub PR URL
- Generate a rubric of 5 to 12 questions via a Genkit flow
- Review UI with one-question-at-a-time card flow
- "Show me the code" peek component
- Verdict screen with copy-to-clipboard
- Deployed to Firebase Hosting with Functions backend
- Responsive design, 375px minimum (mobile-first per `rubric-ui.md`)

**Explicitly out of scope for v1**

- User auth or accounts
- Persisting reviews to Firestore (state lives in URL and component memory)
- Actually posting the review as a GitHub PR comment (copy-to-clipboard is the v1 substitute)
- Private repo support (PAT handling, OAuth flow)
- Multi-reviewer flows
- Editing or regenerating questions
- Question quality feedback loop
- Dark mode
- Analytics or telemetry
- Streaming AI responses (simple loading state is fine)

The cuts are the point. The Loom should call them out by name. "I chose not to build X because the brief said one core flow."

## 7. Architecture

Standard 216LABS pattern. Three pieces.

**Frontend:** React 18 + Vite + TypeScript, deployed to Firebase Hosting. Tailwind for styling. No state library (useState and URL params only). No routing library needed (3 screens, URL params handle state).

**Backend:** Firebase Functions v2 (Node 20) with Genkit. One HTTPS callable function per Genkit flow. No Firestore in v1.

**AI:** Gemini via Genkit (gemini-2.5-flash for cost/speed, or gemini-2.5-pro if quality demands it on the demo).

**External:** GitHub public REST API, unauthenticated.

**File structure:**

```
rubric/
├── functions/
│   ├── src/
│   │   ├── genkit.ts                  # genkit config, ai export
│   │   ├── schemas/
│   │   │   ├── pr.ts                  # PR, PRFile, PRDiff schemas
│   │   │   ├── rubric.ts              # Question, Rubric schemas
│   │   │   └── review.ts              # Answer, Verdict schemas
│   │   ├── tools/
│   │   │   └── github.ts              # ai.defineTool: GitHub API calls
│   │   ├── flows/
│   │   │   ├── generateRubric.ts      # ai.defineFlow: PR -> Rubric
│   │   │   └── scoreReview.ts         # ai.defineFlow: Answers -> Verdict
│   │   └── index.ts                   # onCallGenkit exports
│   ├── package.json
│   └── tsconfig.json
├── web/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx               # PR list + paste URL
│   │   │   ├── Review.tsx             # question cards
│   │   │   └── Verdict.tsx            # verdict + audit trail
│   │   ├── components/
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── CodePeek.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── VerdictBanner.tsx
│   │   ├── lib/
│   │   │   ├── api.ts                 # callable function wrappers
│   │   │   └── github.ts              # parse GitHub URLs
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── firebase.json
├── .firebaserc
└── README.md
```

## 8. Data models (Zod schemas)

All schemas live in `functions/src/schemas/` and are shared via a published types file to the web client (or duplicated for simplicity if the build clock is tight).

```typescript
// schemas/pr.ts
export const PRFileSchema = z.object({
  filename: z.string(),
  status: z.enum(['added', 'modified', 'removed', 'renamed']),
  additions: z.number(),
  deletions: z.number(),
  patch: z.string().optional(),   // unified diff
});

export const PRSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  author: z.string(),
  state: z.enum(['open', 'closed']),
  url: z.string(),
  files: z.array(PRFileSchema),
});

// schemas/rubric.ts
export const QuestionTierSchema = z.enum(['intent', 'behavioral', 'invariant']);

export const QuestionSchema = z.object({
  id: z.string(),
  tier: QuestionTierSchema,
  question: z.string(),                // plain-English yes/no question
  rationale: z.string(),               // one line: why this question matters
  codeContext: z.string().optional(),  // snippet shown on "show me the code"
  expectedAnswer: z.enum(['yes', 'no']).optional(), // AI's best guess
  riskIfWrong: z.string(),             // what breaks if answered wrong
});

export const RubricSchema = z.object({
  prNumber: z.number(),
  prTitle: z.string(),
  prAuthor: z.string(),
  inferredIntent: z.string(),          // what the AI thinks this PR does
  questions: z.array(QuestionSchema).min(5).max(12),
});

// schemas/review.ts
export const AnswerSchema = z.object({
  questionId: z.string(),
  answer: z.enum(['yes', 'no', 'unsure']),
  note: z.string().optional(),
});

export const VerdictSchema = z.object({
  recommendation: z.enum(['approve', 'request_changes', 'needs_human']),
  headline: z.string(),                // one sentence
  summary: z.string(),                 // 2-3 sentences
  concerns: z.array(z.object({
    questionId: z.string(),
    concern: z.string(),
  })),
  auditTrailMarkdown: z.string(),      // ready-to-paste PR comment
});
```

## 9. Genkit flows

Following the 216LABS pattern: deterministic multi-phase flows, Zod validation at every boundary, no regex parsing of LLM output.

**`generateRubricFlow`**

Input: `{ owner: string, repo: string, prNumber: number }`
Output: `RubricSchema`

Phases:
1. **Fetch:** Call `githubFetchPRTool` to get PR metadata + files + patches
2. **Infer intent:** Single Gemini call with the PR title and body, output a one-sentence inferred intent (structured with Zod)
3. **Generate intent questions:** Gemini call with PR body + file list, output 2-4 intent-tier questions
4. **Generate behavioral questions:** Gemini call with patches + intent, output 3-6 behavioral-tier questions with Given-When-Then framing
5. **Generate invariant questions:** Gemini call with patches + explicit prompt for AI-specific failure modes (silent failures, swallowed exceptions, N+1, convention drift), output 2-4 invariant-tier questions
6. **Rank and cap:** Merge all questions, ensure total is between 5 and 12, return RubricSchema

Each sub-phase uses `ai.generate` with a Zod output schema so there is no parsing.

**`scoreReviewFlow`**

Input: `{ rubric: RubricSchema, answers: AnswerSchema[] }`
Output: `VerdictSchema`

Phases:
1. **Tally:** Count yes/no/unsure across all tiers. Deterministic, no LLM call.
2. **Decide recommendation:** Tier-agnostic. The reviewer's explicit answer is the signal; the system does not second-guess it. "No" wins over "unsure" so a single concrete concern drives `request_changes` even if another question was left unsure.
   - Any "no" → `request_changes`
   - Any "unsure" → `needs_human`
   - All "yes" → `approve`
3. **Generate verdict text:** Gemini call with the rubric, answers, and recommendation, output `headline`, `summary`, and formatted `auditTrailMarkdown` (Zod structured output)

**`githubFetchPRTool`**

A `ai.defineTool` wrapping three public GitHub endpoints:
- `GET /repos/{owner}/{repo}/pulls/{num}`
- `GET /repos/{owner}/{repo}/pulls/{num}/files`

Returns a `PRSchema`. No auth required for public repos. Uses `fetch` directly (no SDK dependency). Accepts an optional `GITHUB_TOKEN` env var for higher rate limits.

## 10. GitHub integration

Three GitHub REST endpoints, all unauthenticated for the demo:

1. `GET /repos/{owner}/{repo}/pulls?state=open` — for the home screen PR list
2. `GET /repos/{owner}/{repo}/pulls/{num}` — PR metadata
3. `GET /repos/{owner}/{repo}/pulls/{num}/files` — file changes with patches

Home screen has a hardcoded default repo (Rubric's own GitHub repo) so the demo works with zero input. A "paste a PR URL" input is the alternate path. URL parsing supports both `https://github.com/owner/repo/pull/123` and `owner/repo#123` formats.

Rate limit: 60 requests/hour unauthenticated. Sufficient for demo. If a GitHub PAT is set as an env var, the calls automatically use it for 5000 requests/hour.

## 11. Frontend details

**Home page (`/`)**
- Top section: "Reviewing Rubric's own PRs" (the meta demo framing)
- Below: list of open PRs fetched at page load. Each row shows number, title, author, file count, line count.
- Below that: an input field ("Or paste any public GitHub PR URL") and a button.
- Click any PR → navigate to `/review?owner=X&repo=Y&pr=Z`

**Review page (`/review`)**
- On mount: calls `generateRubricFlow` with the params. Shows a loading state with progress messages ("Fetching PR... Analyzing intent... Generating questions...").
- Once loaded: renders one `QuestionCard` at a time.
- QuestionCard shows: tier badge (intent/behavioral/invariant with color coding), question text, rationale, three buttons (Yes / No / Show me the code).
- "Show me the code" expands the `codeContext` inline with syntax highlighting.
- Answering advances to the next card.
- ProgressBar at top: "3 of 8".
- When all questions answered: call `scoreReviewFlow`, navigate to `/verdict`.

**Verdict page (`/verdict`)**
- VerdictBanner: large colored banner with recommendation (green/yellow/red).
- Headline sentence.
- 2-3 sentence summary.
- Expandable list of concerns, each linking back to the question that raised it.
- "Copy review to clipboard" button → copies `auditTrailMarkdown`.
- "Review another PR" button → back to home.

**Styling:** Tailwind, clean, monochrome with one accent color per tier. Looks designed, not templated. The visual bar should be "a good product studio built this," which matters for the Scrunch evaluators who will judge on UX craft.

## 12. Demo plan

This is the Loom structure.

**Setup before recording:**
1. Push Rubric to `github.com/samflipppy/rubric` (public)
2. Open 3-4 deliberate PRs against the repo. Mix of good and subtly problematic:
   - PR #1: "Add question tier badges" — clean, should approve
   - PR #2: "Improve error handling in fetch flow" — swallows exceptions silently; invariant tier should catch
   - PR #3: "Add loading states" — also touches an unrelated file (scope creep); intent tier should catch
   - PR #4: "Refactor verdict logic" — changes business logic subtly; behavioral tier should catch

**The Loom (3-5 min):**

0:00 — Open on the home screen of deployed Rubric. "This is Rubric, a tool I built for this assignment. You're looking at its own open PRs right now. This tool is going to review itself."

0:20 — "I researched the space. There are 10+ AI PR review tools. They all play the same game: AI generates comments, human reads comments. But research shows only 15% of those comments flag real bugs, and PR review time is up 91% with AI. I think the paradigm is wrong."

0:40 — "Rubric flips it. Instead of giving you more information to read, it asks you questions. This is based on Perspective-Based Reading, a 30-year-old academic approach that finds defects 8x faster than ad-hoc review. Nobody has productized it."

1:00 — Click PR #3 (the one with scope creep). Show the loading sequence.

1:15 — Walk through the first intent question. Answer "no" to catch the scope creep. Show the "show me the code" expansion.

2:00 — Walk through 2 more questions quickly. Show tier variety.

2:30 — Land on the verdict. Show the recommendation is "request changes" with a specific concern. Copy the audit trail to clipboard.

3:00 — "Three things I prioritized: the 10-second comprehension loop, the novel interaction pattern, and shipping something that actually works. Three things I cut: user accounts, persistence, and posting review comments directly to GitHub. I wanted one core flow done well over three flows done halfway."

3:30 — "One thing I'd improve with more time: the question quality feedback loop. If reviewers consistently mark a question as irrelevant, the generator should learn. That's a week of work, not three hours."

4:00 — "This is a real product direction. No tool in the market does this. I'd ship it."

## 13. Success criteria

The take-home is judged on five dimensions. Mapping each to a concrete success bar:

- **Build (did you ship something real?):** App deployed to a public URL, reviews real PRs end-to-end, no placeholder or mocked AI calls in the demo path.
- **Product judgment (did you focus on what matters?):** The thesis ("review-as-decision") is clear within 10 seconds of opening the app. The cuts are defensible.
- **UX (clear, simple, usable?):** A first-time user completes a review without instruction. Progress is visible. Verdict is actionable.
- **Speed (good tradeoffs in 2-3 hours?):** One feature done well. No half-finished UI. No loading states longer than 5 seconds.
- **Leverage (smart use of AI?):** Built with Claude Code. Genkit flows shown off in the Loom. Rubric itself IS the smart use of AI.

The single highest-impact line in the Loom: "This tool just reviewed itself."

## 14. Post-assignment: why this could be a real product

If the take-home goes well and the conversation turns to "could this be a real thing," here is the one-minute answer:

Rubric is not competing with CodeRabbit. It's orthogonal. CodeRabbit generates comments. Rubric generates decisions. Teams could ship both: CodeRabbit surfaces candidate issues, Rubric turns them into human-verifiable questions. The audit trail from Rubric becomes a first-class artifact: six months from now, `git blame` shows the reviewer's explicit sign-off on specific behaviors, not a "LGTM." This is the solution to the "Pull Request Illusion" problem that the industry has been writing about since early 2026.

Monetization is per-seat for reviewers (not per-PR), same as Graphite. The wedge is engineering orgs where AI-generated code volume is crushing review throughput, which is every org above 50 engineers right now.