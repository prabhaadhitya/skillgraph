# SkillGraph — Design System

A **neo-brutalist** system inspired by the references you shared (thick black outlines, hard offset shadows, heavy uppercase headings, highlighted keywords, diagonal marquee, numbered cards, black CTA band), with a **different, warmer palette**: electric violet on cream, with hot-pink accents.

> **Single source of truth:** all values below live in `frontend/src/styles/tokens.css` as Tailwind v4 `@theme` variables. To rebrand, change the tokens only — never hard-code colours or shadows in components.

## 1. Principles
1. **Loud but legible.** Big type and strong borders, but body text stays calm and readable.
2. **Everything is a physical card.** 2 px ink border, square corners, hard shadow. No blur, no gradients, no glassmorphism.
3. **State is never colour alone.** Every status uses colour + icon + text.
4. **One brand colour.** Violet means "SkillGraph / primary action". Semantic colours are reserved for skill states.
5. **Motion confirms, never decorates.** Hover lifts, press sinks, marquee slides. Respect `prefers-reduced-motion`.

## 2. Colour tokens

### Brand and neutrals
| Token | Hex | Use |
|---|---|---|
| `--color-ink` | `#111111` | Text, borders, shadows, dark sections |
| `--color-paper` | `#FFF7E8` | Page background (warm cream) |
| `--color-surface` | `#FFFFFF` | Cards, inputs, modals |
| `--color-brand` | `#6D4AFF` | Primary buttons, highlight blocks, links, focus ring |
| `--color-brand-dark` | `#4B2FD1` | Primary hover/pressed |
| `--color-brand-soft` | `#E6DEFF` | Selected rows, soft fills |
| `--color-pop` | `#FF5CA8` | Secondary accent: sticker tags, marquee dots, "NEW" badges |
| `--color-muted` | `#5B5B66` | Secondary text (≥ 4.5:1 on paper) |
| `--color-line` | `#D9D2C3` | Subtle dividers inside cards |

Text on `brand` is **white**; text on every other fill is **ink**. (Ink on violet is only ~3.7:1 and fails AA.)

### Skill-state colours (graph, badges, charts)
| State | Token | Hex | Icon | Label |
|---|---|---|---|---|
| Mastered | `--color-state-mastered` | `#3DDC97` | `check` | "Mastered" |
| Partial | `--color-state-partial` | `#FFC93C` | `circle-dot` (half) | "In progress" |
| Missing | `--color-state-missing` | `#FF5A5F` | `x` | "Missing" |
| Recommended next | `--color-state-next` | `#4CC9F0` | `sparkles` | "Learn next" |
| Not relevant | `--color-state-muted` | `#D7D7DC` | `minus` | "Not in target" |

Gap statuses map to the same family: `strong → mastered`, `developing → partial`, `major → orange #FF8A3D`, `critical → missing`.

## 3. Typography
Load from Google Fonts in `index.html`.

| Role | Font | Weight | Notes |
|---|---|---|---|
| Display / headings | **Archivo Black** | 400 (already heavy) | Uppercase, tight leading (1.0–1.1) |
| Body / UI | **Inter** | 400 / 500 / 600 | 15–16 px base |
| Labels / numbers / code | **JetBrains Mono** | 500 / 700 | Tags, levels ("Lv 3/4"), small caps feel |

| Style | Size (desktop → mobile) | Use |
|---|---|---|
| `display` | 64 → 38 px | Landing hero only |
| `h1` | 44 → 30 px | Page titles |
| `h2` | 30 → 24 px | Section titles |
| `h3` | 20 px | Card titles (uppercase) |
| `body` | 16 px | Paragraphs |
| `body-sm` | 14 px | Descriptions in cards |
| `caption` | 12–13 px | Helper text |
| `tag` | 11 px, mono, uppercase, letter-spacing 0.08 em | Section tags, chips |

**Highlight device** (from your references): inside a heading, wrap the key words in a block with `background: brand; color: white; padding: 0 .2em;` — e.g. `YOUR SKILLS. [YOUR PATH.]`. Use once per heading, max two per page.

## 4. Spacing, borders, shadows, radius
- Spacing scale (4 px base): `4, 8, 12, 16, 24, 32, 48, 64, 96`. Page gutter 16 px mobile / 24 px tablet / 32 px desktop. Content max width **1200 px**.
- **Border:** `--border: 2px solid var(--color-ink)`. Thin dividers inside cards use `1px solid var(--color-line)`.
- **Radius:** `0` for cards, inputs, buttons, modals, graph nodes. **Pill (`999px`)** only for the floating navbar and small status chips.
- **Shadows (hard, no blur):**

| Token | Value | Use |
|---|---|---|
| `--shadow-sm` | `3px 3px 0 var(--color-ink)` | Buttons, chips, inputs |
| `--shadow-md` | `5px 5px 0 var(--color-ink)` | Cards |
| `--shadow-lg` | `8px 8px 0 var(--color-ink)` | Modals, hero card, selected node |
| `--shadow-brand` | `8px 8px 0 var(--color-brand)` | Dark CTA band (like the lime shadow in your reference) |
| `--shadow-nav` | `0 6px 20px rgba(17,17,17,.15)` | The only soft shadow — floating navbar |

## 5. Interaction states (all interactive elements)
| State | Treatment |
|---|---|
| Hover | `transform: translate(-2px, -2px)`; shadow grows one step (`sm → md`) |
| Active / pressed | `transform: translate(2px, 2px)`; shadow → none |
| Focus-visible | `outline: 3px solid var(--color-brand); outline-offset: 3px` (on dark: white outline) |
| Disabled | 50 % opacity, `cursor: not-allowed`, no hover movement, shadow removed |
| Loading | Button shows spinner + keeps its width; lists use skeletons (ink-outlined blocks, pulsing paper tint) |
Transitions: `120ms ease-out` on `transform, box-shadow, background-color`. Under `prefers-reduced-motion`, drop transforms and the marquee.

## 6. Component library (`frontend/src/components/ui/`) — Member 1 builds these first

| Component | Props (key ones) | Spec |
|---|---|---|
| `Button` | `variant: primary \| secondary \| danger \| ghost`, `size: sm \| md \| lg`, `loading`, `icon` | primary = brand bg + white text; secondary = white; danger = missing red; ghost = no border/shadow. Uppercase 13 px Inter 700, tracking .04 em. Heights 36 / 44 / 52. |
| `Card` | `tone: default \| brand \| pop \| sky \| ink`, `hoverable` | Border + `shadow-md`. `brand` = violet bg/white text; `sky` = `#BFE6FF` (like your "Open-Source Contributing" card); `ink` = black with `shadow-brand`. |
| `Tag` | `tone` | Square, mono 11 px uppercase, 2 px border, `shadow-sm`. Used above section titles. |
| `Badge` | `status` | Pill with icon + label for statuses (mastered, partial, missing, next, strong, developing, major, critical). |
| `Highlight` | children | The violet block keyword device. |
| `Input` / `Textarea` / `Select` | `label`, `error`, `hint` | 48 px height, 2 px border, white; focus = ring + `shadow-sm`; error = missing-red border + message with icon. |
| `LevelPicker` | `value 0–5`, `onChange`, `compact` | **Signature control.** Six square segments `0–5` (label under the active one: "Intermediate"). Keyboard: ← → arrows. Used in onboarding, skill panel, learning path. |
| `Modal` | `title`, `onClose` | Centered, `shadow-lg`, title in display font, close "×" top-right, focus trap, `Esc` closes. Matches your API-key modal reference. |
| `Accordion` | items | Each row a bordered card with `+`/`−` toggle (FAQ). |
| `Marquee` | `items`, `speed` | Rotated −2° brand strip, ink text, `✦` separators in pop colour. |
| `StatBox` | `value`, `label` | Large display number + caption; four boxes in a row share borders (like the reference stats row). |
| `ProgressBar` | `value 0–100`, `segments` | Hard-edged 24 px bar, ink border, brand fill, optional ticks. |
| `Tabs` | | Underline-less: active tab = brand fill. |
| `Toast` | `type` | Bottom-right card with icon. |
| `Skeleton`, `EmptyState`, `ErrorState` | | Required for every data view (see `UX_FLOWS.md` §3). |
| `Navbar` (marketing) | | Floating **pill**, white, `shadow-nav`, logo disc left, links centre, primary CTA right. |
| `Sidebar` (app) | | 240 px, paper bg, 2 px right border; active item = brand fill + white text; collapses to a top bar < 1024 px. |

## 7. Skill graph visual spec (Member 4)

**Skill node** (custom React Flow node):
- Rectangle 168 × 64 px, 2 px ink border, **fill = state colour**, `shadow-sm`; selected → `shadow-lg` + 3 px brand outline.
- Row 1: state icon (16 px) + skill name (Inter 700, 13 px, max 2 lines, ellipsis).
- Row 2: `Lv 3 / 4` in JetBrains Mono 11 px (`current / required`) and a tiny category dot.
- Recommended nodes get a small `NEXT` sticker (pop colour) on the top-right corner.
- Focusable (`tabIndex=0`), `aria-label="Statistics, missing, level 1 of 4 required"`.

**Edges:** `PREREQUISITE` = 2 px solid ink with arrowhead at the dependent; `RELATED_TO` (optional toggle) = 1.5 px dashed `--color-muted`, no arrow. Layout: dagre, `rankdir: LR`, `nodesep 40`, `ranksep 90`. Edges highlight (brand colour, 3 px) for the selected node's prerequisites and unlocks; others fade to 40 % opacity.

**Canvas chrome:** paper background with a subtle 24 px dot grid; toolbar card top-left (search, fit view, "show related" toggle); `Legend` card bottom-left (five states with icon + label); minimap bottom-right (optional, P2); right-hand **Skill Detail Panel** (360 px card, slides in; full-screen sheet on mobile).

## 8. Charts (Recharts)
- Bars: fill `brand`, 2 px ink stroke, no rounded corners, value label in mono. Compare series: `brand`, `pop`, `sky`, `mastered`.
- Lines: 3 px ink line with square brand markers.
- Axes: ink, 12 px Inter; grid lines `line` colour, dashed.
- Always provide a text/table alternative (`aria-label` + visually hidden table or tooltip text).
- Tooltips use the `Card` style.

## 9. Layout and responsiveness
| Breakpoint | Width | Behaviour |
|---|---|---|
| `sm` | ≥ 640 | single column, bottom-sheet panels |
| `md` | ≥ 768 | two-column grids |
| `lg` | ≥ 1024 | sidebar visible, 12-column grid |
| `xl` | ≥ 1280 | max-width 1200 container, graph + side panel side by side |

Demo target is a **laptop (1366×768 and up)**. Phone is best-effort; the graph page should still pan/zoom and show the detail panel as a sheet.

## 10. Page compositions

### Landing (`/`) — adapted from your references
1. **Floating pill navbar:** logo, `How it works · Features · Careers · FAQ`, primary `GET STARTED`.
2. **Hero:** tag `FREE FOR STUDENTS · AI-POWERED`; display heading `YOUR SKILLS.` / `[YOUR PATH.]`; one-line subtitle; **hero card** with a career `Select` + `BUILD MY GRAPH` button and five clickable career chips (like the example-repo chips) → `/register?career=<slug>`.
3. **Marquee:** `SKILL GRAPH ✦ SKILL GAPS ✦ LEARNING PATH ✦ CAREER ALIGNMENT ✦ ASK THE AI ✦ BRING YOUR OWN KEY`.
4. **Stat row:** four `StatBox`es filled from `GET /meta` (e.g. `5 careers`, `70+ skills`, `1 graph`, `0 guesswork`).
5. **How it works:** three numbered cards `01 PICK A CAREER · 02 RATE YOUR SKILLS · 03 FOLLOW YOUR PATH`.
6. **Features:** six cards (brand-tone card for "Interactive skill graph"): graph, skill-gap analysis, learning path, career explorer + what-if, grounded AI assistant, bring-your-own-key.
7. **Use cases:** four small cards (First-year planning, Switching tracks, Placement prep, Project guidance) — one `sky` tone.
8. **FAQ accordion:** 5 questions (Is it free? How is alignment calculated? Is my API key safe? Is the AI always right? Which careers are supported?).
9. **Dark CTA band** (`ink`, `shadow-brand`): `MAP YOUR NEXT [CAREER]` + `GET STARTED` + `VIEW GRAPH DEMO`.
10. **Footer** (ink): logo, product links, "Built by Team SkillGraph · Mini Project 2026".

### App pages
- **Dashboard:** row 1 header card (name + target career + career switch link) · row 2 `AlignmentCard` (huge number, `ProgressBar`, "Previous 54% → Current 61%") + `SummaryCard` (Strong / Developing / Missing as three StatBoxes) · row 3 `NextSkills` list (numbered, with reasons and strategy badge `ML` or `RULES`) + `MiniGraph` preview card (opens the full graph) · right/bottom `AssistantPanel`.
- **Skill Graph:** full-bleed canvas + detail panel (§7).
- **Learning Path:** vertical numbered timeline; each step is a `Card` with from→to `LevelPicker` preview, effort chips, reason `Tag`s, "Ask why".
- **Career Explorer:** career cards grid; compare drawer with three columns (Unique A · Common · Unique B).
- **Settings:** profile card + `LLM settings` card ("API KEY & MODEL") opening the key modal.

### API key modal (adapted from your OpenAI-key reference)
Title `OPENROUTER API KEY` · intro "Use your own key so the assistant works without limits." · **1. Create a key** (primary button "Create key on OpenRouter ↗" → `https://openrouter.ai/keys`) · **2. Paste your key** (`sk-or-…`, password-style input with show/hide) · **3. Choose a model** (select of suggested IDs + free-text "Custom model ID") · `Test key` secondary button with inline result · collapsible **"How your key is used"**: *"Your key is encrypted on our server and never shown again. It is only used to send your questions to OpenRouter. You can delete it anytime."* · footer `Cancel` / `Save key`. Show "Using the shared demo key (limited to N messages/day)" when no key is saved.

## 11. Voice and microcopy
- Direct, friendly, student-level English; short sentences; no jargon without a tooltip.
- Always **"Estimated career alignment"** with an info tooltip explaining the formula in one sentence. Never "probability", "chance", "guaranteed".
- Buttons are verbs: `BUILD MY GRAPH`, `SAVE SKILLS`, `ASK`. 
- Empty states are helpful: *"No skills yet. Add a few and your graph will light up."*
- Errors say what happened and what to do: *"We couldn't reach the assistant. Showing a quick answer instead."*

## 12. Accessibility checklist (per component/page)
- [ ] Contrast ≥ 4.5:1 for text, ≥ 3:1 for UI borders and icons
- [ ] Focus ring visible on every interactive element
- [ ] Keyboard path works: navbar → forms → LevelPicker → graph nodes → panel
- [ ] State shown with icon + text, not colour only
- [ ] Form fields have labels and error text linked via `aria-describedby`
- [ ] Modals trap focus and close with `Esc`
- [ ] Marquee/animations disabled with `prefers-reduced-motion`

## 13. Starter tokens file (`frontend/src/styles/tokens.css`)
```css
@import "tailwindcss";

@theme {
  --color-ink: #111111;
  --color-paper: #FFF7E8;
  --color-surface: #FFFFFF;
  --color-brand: #6D4AFF;
  --color-brand-dark: #4B2FD1;
  --color-brand-soft: #E6DEFF;
  --color-pop: #FF5CA8;
  --color-muted: #5B5B66;
  --color-line: #D9D2C3;

  --color-state-mastered: #3DDC97;
  --color-state-partial: #FFC93C;
  --color-state-missing: #FF5A5F;
  --color-state-next: #4CC9F0;
  --color-state-muted: #D7D7DC;
  --color-state-major: #FF8A3D;

  --font-display: "Archivo Black", system-ui, sans-serif;
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --shadow-sm: 3px 3px 0 var(--color-ink);
  --shadow-md: 5px 5px 0 var(--color-ink);
  --shadow-lg: 8px 8px 0 var(--color-ink);
  --shadow-brand: 8px 8px 0 var(--color-brand);
  --shadow-nav: 0 6px 20px rgba(17, 17, 17, 0.15);
}

:root { --border: 2px solid var(--color-ink); }
body { background: var(--color-paper); color: var(--color-ink); font-family: var(--font-sans); }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
```
