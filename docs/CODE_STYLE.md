# SkillGraph — Code Style and Team Conventions

Five people, one monorepo, seven days. These rules exist to prevent merge pain and make every module look like the same author wrote it.

## 1. General principles
1. **Readable over clever.** A teammate should understand a file in one pass.
2. **Small files, small functions.** Prefer < 200 lines per file and < 40 lines per function.
3. **Business logic lives in services** (backend) and **hooks** (frontend), not in controllers or JSX.
4. **No dead code, no commented-out blocks, no `console.log` left behind** (use the logger).
5. **Contracts first.** If code and `API.md`/`DATABASE.md` disagree, fix the doc in the same PR.
6. **No magic numbers.** Engine weights and limits live in `backend/src/config/constants.js`.

## 2. Tooling (set up on Day 1 by Members 1 and 2, shared by everyone)
| Tool | Where | Config |
|---|---|---|
| Prettier | frontend, backend | `semi: true, singleQuote: true, printWidth: 100, trailingComma: "all"` |
| ESLint (flat config) | frontend (react + hooks plugins), backend (node) | extends recommended; `no-unused-vars: error`, `no-console: warn` (backend allows `logger`) |
| Ruff + Black | ml-service | line length 100 |
| EditorConfig | root | UTF-8, LF, 2 spaces (4 for Python), final newline |
| Husky + lint-staged | optional (P2) | lint changed files on commit |

Run `npm run lint` before every PR.

## 3. JavaScript (frontend and backend)
- **ES modules** everywhere (`"type": "module"`), `import`/`export`, no `require`.
- `const` by default, `let` when reassigning, never `var`. Strict equality only.
- `async/await` (no raw `.then` chains); always handle errors (`try/catch` in services only when you add value, otherwise let `asyncHandler` forward).
- Use optional chaining / nullish coalescing for safe access.
- Document public functions and shared shapes with **JSDoc** (we use JavaScript, so JSDoc is our type documentation):
```js
/**
 * @typedef {{ slug: string, name: string, category: string, difficulty: number }} Skill
 * @param {Record<string, number>} profile  skill slug -> proficiency 0..5
 * @returns {number} integer 0..100
 */
export function computeFitScore(skills, careerSkills, profile) { /* … */ }
```
- Naming: `camelCase` variables/functions, `PascalCase` components/classes/models, `UPPER_SNAKE_CASE` constants, `kebab-case` for slugs and CSS classes (Tailwind), boolean names start with `is/has/can/should`.
- Imports order: node/third-party → absolute app modules → relative → styles. Prefer named exports; default export only for React page components and route modules.

## 4. Backend (Node + Express, MVC)

### File naming
`<resource>.<role>.js` — e.g. `user.model.js`, `user.controller.js`, `user.routes.js`, `user.validator.js`, `user.service.js`. Engine files are plain nouns: `gap.js`, `fit.js`, `priority.js`, `path.js`, `graph.js`.

### Layer rules
| Layer | May | May not |
|---|---|---|
| `routes` | map path → middleware chain → controller | contain logic |
| `validators` | define zod schemas | touch DB |
| `middleware` | auth, role, validation, errors, rate limits | contain business rules |
| `controllers` | read `req`, call one service, call `respond.*` | query models directly, compute scores |
| `services` | business logic, call models, call other services | read `req`/`res` |
| `services/engine` | **pure functions only** | import Mongoose, `fetch`, env, Date.now (pass time in) |
| `models` | schema, indexes, statics | business rules |

### Patterns
```js
// controller (thin)
export const getSkillGap = asyncHandler(async (req, res) => {
  const { career } = req.validated.query;
  const data = await analysisService.getSkillGap(req.user.id, career);
  respond.ok(res, data);
});
```
```js
// errors
throw new ApiError(422, 'RULE_VIOLATION', 'That would create a loop', details);
```
- Success: `respond.ok(res, data, meta?)`, `respond.created(res, data)`. Errors only via `ApiError` + `errorHandler`.
- Always use `req.user.id` for ownership; never read a user id from the body/params.
- Mongoose reads that return lists use `.lean()` unless you need virtuals/toJSON.
- Environment access only through `config/env.js`.
- Add an index whenever you add a query pattern that needs one (and update `DATABASE.md`).

## 5. Frontend (React + Vite + Tailwind)
- **Function components and hooks only.** One component per file, file name = component name (`SkillNode.jsx`).
- Folders by role (see `ARCHITECTURE.md` §2). Page components compose; `components/ui` are dumb and reusable.
- **Server data** via TanStack Query hooks in `hooks/` (`useDashboard`, `useGraph`, …) calling `services/*.js`. Components never call `fetch` directly.
- Query keys: `['dashboard']`, `['graph', careerSlug]`, `['path', careerSlug]`, `['gap', careerSlug]`, `['fit', careerSlug]`, `['skill', slug]`, `['careers']`, `['insights']`.
- After any skill/target change call `queryClient.invalidateQueries` for those keys (helper `invalidateAnalysis()`).
- Styling: Tailwind utility classes using **token-based classes only** (`bg-brand`, `border-ink`, `shadow-md`). No hex codes in components. Extract repeated class sets into `ui/` components, not `@apply` soup.
- Accessibility is part of "done": labels, focus states, keyboard support, icon + text for state (see `DESIGN_SYSTEM.md` §12).
- Props: destructure in the signature, give defaults, validate with JSDoc. Keep components under ~150 lines; extract hooks/sub-components.
- Every data view implements loading/empty/error states (`UX_FLOWS.md` §3).
- No inline `style={{}}` except for dynamic values (e.g. progress width).

## 6. Python (ML service)
- PEP 8, type hints on all functions, `pydantic` models for requests/responses.
- Pure functions for features (`features.py`) so they are unit-testable; no global state besides the loaded model.
- Deterministic training: set `random_state` everywhere; save seeds in `model_info.json`.
- Never import from the backend; read only `shared/seed/*`.

## 7. Git workflow
**Branches:** `main` is always demo-ready. Work on `m<N>/<area>-<short-description>`, e.g. `m2/auth-api`, `m4/graph-canvas`, `m3/engine-fit`.

**Commits:** Conventional Commits.
```
feat(graph): render skill nodes with state colours
fix(auth): reject duplicate email with 409
docs(api): document what-if response
test(engine): cover learning-path ordering
chore: configure eslint
```

**Pull requests**
1. Branch from latest `main`; **merge/rebase `main` into your branch daily** and before opening a PR.
2. One PR = one focused change (< ~400 lines when possible).
3. PR description: what, why, how to test, screenshots for UI, **docs changed (yes/no)**.
4. At least one review by someone else (the integrator reviews anything touching shared files).
5. CI-less project: before merging run `npm run lint` and `npm test` in the touched packages.
6. Squash-merge. Delete the branch after merge.

**Shared files** (`package.json` at root, `shared/seed/*`, `docs/*`, `.env.example`, `constants.js`, `tokens.css`): change only via PR and mention it in the team chat.

**Never commit:** `.env`, `node_modules`, `dist`, `*.joblib`, large generated datasets (`profiles.csv` is gitignored; commit the generator and a 50-row sample).

## 8. Comments and docs in code
- Comment *why*, not *what*. Link the doc section for formulas (`// see ARCHITECTURE.md §5.3`).
- Every engine function has JSDoc with the formula.
- Public endpoints have a one-line comment above the route naming the doc section.

## 9. Error handling and logging
- Backend: throw `ApiError`; unexpected errors become `INTERNAL_ERROR`. Never swallow errors silently.
- Frontend: services throw a typed `ApiError`; hooks expose `error`; pages render `ErrorState`.
- Logging via `utils/logger.js` (`info`, `warn`, `error`) — never log secrets or bodies.

## 10. Definition of done for any task
- [ ] Works locally against the real endpoint (or the documented mock shape)
- [ ] Matches `API.md` / `DATABASE.md` / `DESIGN_SYSTEM.md`
- [ ] Lint passes, no `console.log`
- [ ] Tests added for logic (engine/services mandatory; UI where cheap)
- [ ] Loading/empty/error states handled
- [ ] No secrets, no hard-coded colours or magic numbers
- [ ] Docs updated if a contract changed
- [ ] PR opened with description and reviewed

## 11. Rules for AI agents (Antigravity) — also in `AGENTS.md`
Read the relevant docs first; stay in your owned folders; do not invent endpoints, fields or colours; do not add dependencies without saying why; keep diffs small; run lint and tests; report what you changed and what you did **not** do.
