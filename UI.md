# Rubric — UI/UX Specification

**Companion to:** `rubric-prd.md`
**Design target:** Mobile-first, 375px minimum. Desktop is a scaled-up variant, not a different layout.

---

## 1. Design principles

Four rules that override everything else.

**Understand in 10 seconds.** The assignment bar. Every screen has one unambiguous primary action. If a screen requires a second look to understand, it fails the brief.

**One thing at a time.** The product's thesis is compression. The UI reflects it: one question per card, one recommendation per verdict, one action per button.

**Mobile-first, desktop-enhanced.** Every screen is designed at 375px first. Desktop gets more breathing room, not more content.

**Distinctive, not decorated.** Character comes from typography and restraint, not ornament. No gradients, no glows, no stacked shadows. One accent color per tier, everything else black and white.

## 2. Assignment UX requirements, mapped

The brief has two hard UX requirements. These are the acceptance tests for every screen.

**"Understand what changed within 10 seconds."**
- Home: the subhead + PR titles tell the user where they are and what they can do
- Review: the question IS the summary of that change. No diff reading required.
- Verdict: hero banner delivers the recommendation in one glance

**"Know what to do next without explanation."**
- Home: PR rows are obvious click targets, with a secondary "paste a URL" path
- Review: three buttons (Yes / No / Show me the code), nothing else on screen competing
- Verdict: one primary CTA ("Copy review"), one secondary ("Review another PR")

If a screen can't pass both tests at a glance, redesign it.

## 3. Design system

### Color

Light mode only. Six base colors, three tier accents, three verdict colors.

```css
--bg:          #FAFAF7  /* cream base, softer than pure white */
--surface:     #FFFFFF  /* cards, elevated surfaces */
--ink:         #0A0A0A  /* primary text */
--muted:       #737373  /* secondary text */
--border:      #E5E5E5  /* hairline dividers */
--hover:       #F5F5F0  /* subtle interactive state */

/* Tier accents — used only on tier badges and subtle card accents */
--intent:      #D97706  /* amber, "does it do what it claims" */
--behavioral:  #2563EB  /* blue, "given this state, is it right" */
--invariant:   #7C3AED  /* violet, "hidden issues" */

/* Verdict banners only */
--approve:     #16A34A  /* green */
--changes:     #EA580C  /* orange, not red — changes requested is not failure */
--needs-human: #6B7280  /* gray — uncertainty */
```

No dark mode in v1. Keep focus.

### Typography

Two fonts. No more.

- **Inter** (variable, Google Fonts) for everything
- **JetBrains Mono** for code snippets only

Mobile sizes (line-height in parens):

```
--text-xs:   12px (16)   /* tier labels, metadata */
--text-sm:   14px (20)   /* rationale, helper text */
--text-base: 16px (24)   /* body, buttons */
--text-lg:   18px (28)   /* PR titles on home */
--text-xl:   22px (32)   /* the question itself */
--text-2xl:  28px (36)   /* verdict headline, mobile */
--text-3xl:  36px (44)   /* verdict headline, desktop */
```

Weights: 400 (body), 500 (emphasis), 600 (headlines). Never 700+.

The question text is the largest thing on the review screen. Everything else is subordinate.

Load fonts with `font-display: swap` and preload Inter. No FOUT on first paint.

### Spacing

8px base unit. Multiples only: 4, 8, 12, 16, 24, 32, 48, 64. Default card padding is 24px mobile, 32px desktop.

### Corners and elevation

- Cards: 16px radius
- Buttons and inputs: 12px radius
- **No shadows.** A 1px `--border` hairline handles all elevation. Shadows on a clean light product look cheap.

## 4. Breakpoints

```
Mobile:   375–767px   (primary design target)
Tablet:   768–1023px  (scales up, slight padding increase)
Desktop:  1024px+     (max content width 640px, centered)
```

Desktop never unlocks a second column. Same structure, more margin.

## 5. Screen specifications

### 5.1 Home (`/`)

Purpose: pick a PR to review in under 10 seconds.

**Mobile layout (375px):**

```
┌────────────────────────────────┐
│  Rubric                         │  ← wordmark, 24px ink
│  Review PRs by answering        │  ← subhead, 14px muted,
│  questions, not reading diffs.  │     2 lines max
├────────────────────────────────┤
│  OPEN PRS — samflipppy/rubric   │  ← 12px uppercase muted
│  ┌──────────────────────────┐   │
│  │ #4 Add verdict banner    │   │
│  │ 3 files · +87 −12        │   │  ← 16px row padding, tappable
│  │ @samflipppy              │   │     entire card
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ #3 Improve error handling│   │
│  │ 2 files · +34 −8         │   │
│  │ @samflipppy              │   │
│  └──────────────────────────┘   │
├────────────────────────────────┤
│  Or paste any PR URL            │  ← 14px muted
│  ┌──────────────────────────┐   │
│  │ github.com/...           │   │
│  └──────────────────────────┘   │
│  [    Review this PR     ]      │  ← full width, 48px height
└────────────────────────────────┘
```

**States:**
- Loading PRs: three skeleton rows (shimmer at 1.5s cycle)
- No open PRs: "No open PRs right now. Paste a URL to try it out."
- Rate limited: "GitHub is rate limiting us. Paste a URL to continue."
- Invalid URL: input border turns `--changes`, helper text appears below

**Desktop:** max-width 640px, centered. Top margin 64px. Everything else identical.

### 5.2 Review (`/review?owner=X&repo=Y&pr=N`)

Purpose: answer questions one at a time, with an escape hatch to peek at code.

**Mobile layout:**

```
┌────────────────────────────────┐
│  ■ ■ ■ □ □ □ □ □                │  ← 8 segments, 3 filled
│  PR #4 · Add verdict banner     │  ← 14px muted
├────────────────────────────────┤
│                                 │
│  ● BEHAVIORAL                   │  ← tier badge, 12px, dot + label
│                                 │
│  When a reviewer answers        │
│  "unsure" on an intent          │  ← 22px question, ink
│  question, should the verdict   │     max-width 28ch
│  default to "needs review"?     │
│                                 │
│  This drives the core decision  │  ← 14px rationale, muted
│  logic. An unsure intent answer │     max-width 40ch
│  means AI drift is possible.    │
│                                 │
├────────────────────────────────┤
│   [ Show me the code ]          │  ← secondary, 44px, full width
│                                 │
│  ┌────────┐   ┌────────┐        │
│  │   No   │   │  Yes   │        │  ← 48px, equal width
│  └────────┘   └────────┘        │
│                                 │
│         [ Unsure ]              │  ← 14px text link, centered
└────────────────────────────────┘
```

**Layout notes:**
- Yes gets filled style, No gets outlined style. They're equal-weight but the "expected" answer is slightly more prominent.
- "Show me the code" sits ABOVE Yes/No. Peeking should happen before answering, not after.
- "Unsure" is tertiary text-link style. It's the escape hatch, not a first-class answer.

**Code peek:**
- Mobile: bottom sheet, 70% viewport height, slides up in 250ms. Question stays visible in the remaining 30%. Tap backdrop or swipe down to dismiss.
- Desktop: inline expansion below the card, card slides up 200ms.

**Loading state (first mount):**

Full-viewport centered sequence. Text swaps every ~2s:

```
"Fetching PR..."
"Analyzing intent..."
"Generating questions..."
```

If it's still loading at 8s, show "Taking a bit longer..." Don't spin forever without acknowledging.

**Interactions:**
- Tap Yes/No: card slides left 200ms, next card slides in from right
- Tap "Show me the code": bottom sheet (mobile) or inline (desktop)
- Tap "Unsure": same as Yes/No flow but records `unsure`
- Swipe right: Yes (mobile progressive enhancement, must also work with taps)
- Swipe left: No (mobile progressive enhancement)
- Swipe up: Show me the code (mobile progressive enhancement)
- Keyboard Y / N / U / C: answer or peek (desktop)

All swipe gestures are progressive enhancement. Taps always work.

### 5.3 Verdict (`/verdict`)

Purpose: deliver the recommendation and let the reviewer ship it.

**Mobile layout:**

```
┌────────────────────────────────┐
│                                 │
│         ●                       │  ← 24px dot, verdict color
│                                 │
│     Request changes             │  ← 28px, ink, weight 600
│                                 │
│  3 intent answers suggest this  │  ← 16px, muted
│  PR bundles changes outside     │     max-width 36ch
│  the description.               │
│                                 │
├────────────────────────────────┤
│  CONCERNS                       │  ← 12px uppercase muted
│                                 │
│  ┌──────────────────────────┐   │
│  │ ● INTENT                 │   │
│  │ PR description says      │   │
│  │ "error handling" but the │   │  ← concern card, tappable
│  │ diff adds new UI routes. │   │     to expand
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ ● BEHAVIORAL             │   │
│  │ Expired sessions are no  │   │
│  │ longer logged out...     │   │
│  └──────────────────────────┘   │
├────────────────────────────────┤
│ [ Copy review to clipboard ]    │  ← primary, sticky bottom,
│ [ Review another PR ]           │     respects safe-area inset
└────────────────────────────────┘
```

**States:**
- Approve verdict: green dot, no concerns list. Single line: "No concerns raised."
- Changes requested: orange dot, list of concerns from no-answered questions
- Needs human: gray dot, neutral copy ("This PR needs a closer look")
- On copy: button text becomes "Copied ✓" for 2s, then reverts

**Interactions:**
- Tap concern card: expands to show the original question and the reviewer's answer + any note
- Copy button: writes formatted markdown to clipboard using Clipboard API
- Review another: navigate back to `/`

**Sticky actions on mobile:** The two action buttons are anchored to the bottom with `position: sticky` + `padding-bottom: env(safe-area-inset-bottom)` so they don't hide under the iOS home indicator.

## 6. Component specs

### QuestionCard

Props: `question`, `index`, `total`, `onAnswer`, `onPeek`.

Structure:
1. TierBadge (dot + label)
2. Question text (22px ink, max 28ch wide)
3. Rationale (14px muted, max 40ch wide)
4. Actions dock (sticky bottom on mobile)

Vertical centering: question text sits at optical center of viewport. Rationale sits just below.

### TierBadge

```
● INTENT
```

8px colored circle (tier color) + 12px uppercase label with `letter-spacing: 0.05em`. No pill background, no border. Minimal.

### CodePeek

Two modes based on viewport width.

**Mobile (<768px):** bottom sheet. Header bar with "Code context" (14px) on the left and a close (X) button on the right. Body is a scrollable `<pre>` with syntax highlighting.

**Desktop:** inline expansion. Question card pushes up, code appears in the space below. Same `<pre>` body.

Syntax highlighting: use Shiki (smaller bundle) or a tiny custom tokenizer. Don't import Prism — it's heavy.

### ProgressBar

Segmented, one segment per question. Not a continuous fill bar.

```
■ ■ ■ □ □ □ □ □
```

- Filled segments: `--ink`
- Current segment: `--ink` with a subtle 1.2s pulse
- Unfilled: `--border`
- Segment height: 4px, radius 2px, gap 4px

This reads as a step counter, not a timer. Users should feel progress, not pressure.

### VerdictBanner

Three variants (approve / changes / needs-human). Visual elements in order:
1. Large colored dot (24px mobile, 32px desktop)
2. Recommendation text (28px / 36px)
3. One-line summary (16px muted, 2 lines max)

**No icons.** Check marks and X's feel like Slack bot output. The colored dot + type hierarchy is enough.

## 7. Motion

**Principles:**
- All animations ≤ 250ms
- Use `transform` and `opacity` only (no layout thrashing)
- Respect `prefers-reduced-motion: reduce` (swap slides for fades)

**Transitions:**
- Question to next question: 200ms slide-out left, new card slides in from right
- Review to verdict: 300ms fade + slight slide up
- Code peek open (mobile): 250ms bottom sheet slide up, 150ms backdrop fade-in
- Code peek open (desktop): 200ms height expand in place

**Micro-interactions:**
- Button press: 100ms `scale(0.97)`
- PR row tap: 80ms background fades to `--hover`
- Copy success: 2s "Copied ✓" state, then revert

Nothing should linger. Fast feels professional.

## 8. Accessibility

- All interactive elements are at least 44x44px tap targets
- Text contrast: 4.5:1 minimum (WCAG AA), 3:1 on interactive elements
- Tier color is never the sole signal. Always paired with the text label.
- Keyboard nav: Tab through all actions. Enter or Space to activate. Y / N / U / C shortcuts on review page.
- Focus rings are visible and use `outline: 2px solid var(--ink)` with a 2px offset
- `prefers-reduced-motion: reduce` disables all slide transitions, uses 150ms fade instead
- `aria-live="polite"` region on the verdict screen announces the recommendation
- Question cards use `role="group"` with appropriate `aria-label`
- Yes/No/Unsure buttons have explicit `aria-label` text

## 9. Copy voice

Direct, brief, slightly dry. No exclamation marks. No AI-voice phrasing. No emojis in UI copy except the single check mark on copy success.

**Yes:**
- "Review PRs by answering questions, not reading diffs."
- "When an expired session hits /refresh, should the user be logged out?"
- "Request changes"
- "Copy review to clipboard"
- "GitHub is rate limiting us. Paste a URL to continue."

**No:**
- "Let's check out this PR! 🚀"
- "Great job! You're all done!"
- "Oops, something went wrong."
- "Your AI reviewer is thinking..."

Error messages: what happened + what to do. One sentence.

## 10. Anti-patterns

Things to actively avoid, in priority order:

1. **No AI-looking gradients, glows, or "shiny" CSS.** This is the #1 tell of a rushed AI-coded project. Keep it flat.
2. **No stacked shadows.** A single hairline border is more elegant than three layered shadows.
3. **No emoji tier icons.** Colored dot + text label only.
4. **No animation on first paint.** Animations are for transitions, never decoration.
5. **No "AI is thinking" or robot metaphors.** This is a serious tool.
6. **No generic loading spinners.** Use the three-phase text sequence from the review loading state.
7. **No modal dialogs.** Bottom sheets (mobile) or inline expansion (desktop).
8. **No "powered by" footer.** The product is the pitch.
9. **No dark mode toggle.** Light mode only. One less thing to get wrong.
10. **No confetti, no celebration states.** The verdict is the payoff, not a party.

## 11. Acceptance tests before shipping

Before the Loom, verify each of these on a real device (not just Chrome DevTools emulation):

- [ ] Home loads and shows real open PRs within 2 seconds on 4G
- [ ] Tapping a PR transitions to Review within 200ms (loading state shown)
- [ ] Question text is readable at arm's length on an iPhone SE (375px)
- [ ] Yes/No buttons are thumb-reachable in one-handed use
- [ ] Code peek bottom sheet dismisses with swipe-down
- [ ] Swipe right/left register as yes/no (don't accidentally trigger scroll)
- [ ] Verdict banner is legible in direct sunlight (sufficient contrast)
- [ ] Copy button actually writes the formatted markdown to clipboard
- [ ] Full review completes in under 2 minutes from home to verdict
- [ ] The app works on iOS Safari, Chrome Android, and Chrome/Safari desktop

If any of these fail, fix before recording the Loom.