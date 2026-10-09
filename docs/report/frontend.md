# Chapter: Frontend Architecture & User Experience

## 1. Purpose and Screen Inventory

The SkillGraph frontend is a responsive web application designed to help university students map their current competencies against target career profiles, inspect dependency graphs, follow a prerequisite-aware curriculum roadmap, and query a grounded AI assistant. The interface adopts an editorial neo-brutalist design language that prioritizes clarity, bold hierarchy, and cognitive focus.

The application serves three distinct user roles: unauthenticated visitors, enrolled students, and academic administrators. Across these personas, 18 primary views have been developed, audited, and visually captured:

| ID | Route | Screen Name | Access Level | Persona / Viewport | Primary User Task |
|---|---|---|---|---|---|
| 01 | `/` | Landing Page | Public | Visitor (1366×768) | Explore value proposition, career previews, and platform mechanics |
| 02 | `/register` | Account Registration | Public | Visitor (1366×768) | Create student account with password validation checklist |
| 03 | `/onboarding` | Skills Selection (Step 3) | Student (New) | Newbie (1366×768) | Select known skills from catalog & career recommendations |
| 04 | `/app/dashboard` | Student Dashboard | Student | Prabha (1366×768) | View alignment score (26%), status counts, and recommended next skills |
| 05 | `/app/graph` | Skill Graph Canvas | Student | Prabha (1366×768) | Explore interactive DAG topology with zoom, search, and legend |
| 06 | `/app/graph` | Node Detail Panel | Student | Prabha (1366×768) | Inspect requirements, prerequisites, unlocks, and adjust proficiency |
| 07 | `/app/path` | Learning Pathway | Student | Prabha (1366×768) | Follow ordered curriculum sequence with effort tags and reason codes |
| 08 | `/app/careers` | Career Explorer | Student | Prabha (1366×768) | Browse all 5 career tracks with individual estimated alignment scores |
| 09 | `/app/careers` | Career Comparison | Student | Prabha (1366×768) | Side-by-side breakdown: Only in A, In Both, Only in B with importance bars |
| 10 | `/app/careers` | What-If Simulation | Student | Prabha (1366×768) | Model target switch: alignment delta, new requirements, and effort shift |
| 11 | `/app/analytics` | Student Analytics | Student | Prabha (1366×768) | Track category distributions, alignment trends, and skill gap deficits |
| 12 | `/app/assistant` | Grounded AI Assistant | Student | Prabha (1366×768) | Query curriculum advice grounded in student profile with prompt chips |
| 13 | `/app/settings` | Settings & LLM Config | Student | Prabha (1366×768) | Configure OpenRouter API keys and select preferred LLM models |
| 14 | `/admin/overview` | Admin Overview | Admin | Admin (1366×768) | Inspect cohort aggregates, gap distributions, and ML model performance |
| 15 | `/admin/skills` | Skills Management | Admin | Admin (1366×768) | Search, filter, add, edit, and inspect dependency-blocked skill rows |
| 16 | `/admin/relationships` | Relationship Matrix | Admin | Admin (1366×768) | Manage prerequisites and related edges with cycle prevention checks |
| 17 | `/admin/careers` | Career Configuration | Admin | Admin (1366×768) | Configure career track skill sets, required levels, and closure models |
| 18 | `/app/dashboard` | Mobile Dashboard | Student | Prabha (390×844) | Access core metrics, career target, and next steps on mobile devices |

---

## 2. Technology Stack & Technical Rationale

The frontend stack was chosen to maximize interactive performance, developer ergonomics, and deterministic data flow:

- **React 19 + Vite**: React provides component-driven declarative UI rendering. Vite delivers instant Hot Module Replacement (HMR) and fast ES-module builds without heavy bundling overhead.
- **Tailwind CSS v4**: Utility-first styling coupled with a centralized CSS custom property design system (`tokens.css`). Tailwind v4 eliminates build-step CSS configuration, ensuring fast builds and strict design consistency.
- **TanStack Query v5 (`@tanstack/react-query`)**: Dedicated server-state management engine handling background synchronization, query caching, request deduplication, and optimistic update rollbacks.
- **React Flow (`@xyflow/react`)**: High-performance SVG/HTML5 canvas library for interactive node-edge graph visualization. Supports smooth panning, zooming, custom nodes (`SkillNode`), and viewport auto-fitting.
- **Dagre (`@dagrejs/dagre`)**: Client-side Directed Acyclic Graph (DAG) layout engine that computes left-to-right node positions mathematically from dependency relationships without blocking server resources.
- **Recharts**: Declarative React chart library built on native SVG elements. Used for student category distributions, historical alignment timelines, and admin cohort analytics.
- **Lucide React (`lucide-react`)**: Clean, consistent, tree-shakeable SVG icon library aligning with the neo-brutalist design aesthetic.
- **React Router v7**: Declarative client-side routing supporting protected route guards (`ProtectedRoute`, `AdminRoute`), nested layouts (`AppShell`, `AdminLayout`), and URL parameter synchronization.

---

## 3. Directory & Folder Structure

```
frontend/src/
├── components/
│   ├── charts/          # CategoryBarChart, HistoryLineChart, MetricCard
│   ├── chat/            # ChatPanel, MessageBubble, PromptChips, TypingIndicator
│   ├── feedback/        # ErrorBoundary, NotFoundPage
│   ├── graph/           # SkillNode, GraphCanvas, SkillDetailPanel, Legend, layout.js
│   ├── layout/          # AppShell, Navbar, Sidebar, AdminLayout, Footer
│   ├── settings/        # ApiKeyModal, ModelPicker
│   └── ui/              # Button, Card, Badge, Tag, Input, Select, Modal, LevelPicker,
│                        # StatBox, ProgressBar, Skeleton, ErrorState, EmptyState, Toast
├── context/             # AuthContext.jsx (session authentication state)
├── hooks/               # useAuth, useDashboard, useGraph, useLearningPath, useCareers,
│                        # useCareerExplorer, useSkillDetail, useUpdateSkill, useAdminOverview
├── pages/               # Landing, Login, Register, SkillGraph, LearningPath,
│   ├── admin/           # Overview, Skills, Relationships, Careers
│   ├── auth/            # LoginPage, RegisterPage
│   ├── careers/         # CareerExplorer, CareerCard, CareerCompareView, WhatIfModal
│   ├── dashboard/       # DashboardPage, AlignmentCard, SummaryStats, NextSkillsList
│   ├── onboarding/      # OnboardingPage, 5 step components (About, Career, Skills, Rating, Review)
│   ├── profile/         # ProfilePage
│   └── settings/        # SettingsPage
├── routes/              # router.jsx, ProtectedRoute.jsx, AdminRoute.jsx
├── services/            # api.js (unified HTTP client with envelope unwrapping),
│                        # authService, catalogService, analysisService, aiService, adminService
├── styles/              # tokens.css (color tokens, shadows, font declarations), globals.css
└── utils/               # reasonLabels.js, passwordRules.js, queryHelpers.js
```

---

## 4. State Management Architecture

State in SkillGraph is strictly partitioned into **Client State** and **Server State**:

1. **Client State (React Context & Local State)**:
   - `AuthContext`: Holds session authentication (`user`, `login`, `register`, `logout`), verifying user roles and onboarding completion status across route transitions.
   - Page/Component State: Form inputs, modal visibilities, filter toggles, search inputs, and React Flow viewport coordinates.
2. **Server State (TanStack Query)**:
   - Every API endpoint is represented by a structured query key (`['analysis', 'dashboard']`, `['analysis', 'graph', career]`, `['analysis', 'learning-path', career]`, `['careers']`, `['analysis', 'career-fit', slug]`).
   - Stale-time defaults prevent redundant network calls while enabling automatic re-fetching on window refocus.
3. **The `invalidateAnalysis` Invalidation Cascade**:
   - The central data mutation in the application is updating skill proficiency (`PATCH /api/users/me/skills/:skillSlug`) or switching target careers.
   - When a skill level changes, the `useUpdateSkill` hook triggers `queryClient.invalidateQueries` across:
     - `['analysis', 'dashboard']`
     - `['analysis', 'graph']`
     - `['analysis', 'learning-path']`
     - `['analysis', 'insights']`
     - `['analysis', 'career-fit']`
   - This causes the dashboard alignment score, the graph node colors, the ordered learning pathway, and career fit percentages to synchronize immediately with zero manual state plumbing.

---

## 5. Design System Summary

SkillGraph implements an editorial **Neo-Brutalist** design system designed to convey structural clarity, academic rigor, and visual distinction:

- **Color Tokens**:
  - `bg-paper` (`#FBF8EF`): Warm retro-editorial background replacing sterile pure white.
  - `bg-surface` (`#FFFFFF`): Elevated card and container background.
  - `text-ink` (`#000000`): Pure black typography and high-contrast element borders.
  - `brand` (`#635BFF`): Primary vibrant indigo accent for primary CTAs, active routes, and target progress.
  - State Tokens: `state-mastered` (`#10B981` green), `state-developing` (`#F59E0B` amber), `state-missing` (`#EF4444` red), and `state-recommended` (`#8B5CF6` violet).
- **Typography Hierarchy**:
  - Headings / Display: **Archivo Black** (bold, uppercase, punchy neo-brutalist titles).
  - Body / UI Controls: **Inter** (high legibility at small sizes, optimal UI spacing).
  - Labels, Badges & Code: **JetBrains Mono** (tabular numerals, status chips, percentage deltas).
- **Component Primitives**:
  - Strict 2px solid black borders (`border-2 border-ink`) with crisp rectangular hard drop-shadows (`shadow-2xs`, `shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-lg`).
  - Interactive tactile states: Buttons and cards depress on click (`active:translate-x-0.5 active:translate-y-0.5 active:shadow-none`).
  - Data States: Every view consistently handles **Loading** (structured `Skeleton` pulsing blocks), **Empty** (`EmptyState` with a clear next CTA), and **Error** (`ErrorState` with retry buttons).

---

## 6. Accessibility & Lighthouse Audits

Accessibility was treated as an architectural requirement rather than a post-launch cosmetic fix:

- **Keyboard Navigation**: All interactions are fully operable via keyboard. The multi-step onboarding wizard shifts keyboard focus to the step heading on transition; modal dialogs lock and restore focus; dropdown menus and `LevelPicker` controls support native arrow key navigation.
- **Semantic HTML & ARIA**: Custom components expose appropriate accessibility roles (`role="radiogroup"`, `role="radio"`, `role="dialog"`, `role="alert"`, `aria-label`).
- **Touch & Contrast Standards**: All interactive touch targets measure at least 44×44 pixels. Color pairings strictly adhere to WCAG AA contrast ratios (minimum 4.5:1 for body copy; 7:1 for headers).
- **Lighthouse Performance & Accessibility Scores**:
  - **Landing Page (`/`)**: **94** (Accessibility)
  - **Student Dashboard (`/app/dashboard`)**: **96** (Accessibility)

---

## 7. Mock-First Development & Testing

- **Mock-First Workflow**: Development began with complete TypeScript/JSDoc mock fixture files (`frontend/src/mocks/`) mirroring the contracts in `docs/API.md`. This allowed frontend layout, routing, graph algorithms, and responsive design to be implemented and reviewed ahead of backend database and ML deployments with zero throwaway code.
- **Unit & Component Testing**: Vitest and React Testing Library cover core pages and UI components (`Landing.test.jsx`, `Login.test.jsx`, `Dashboard.test.jsx`, `SkillGraph.test.jsx`, `LearningPath.test.jsx`, `Assistant.test.jsx`).
- **End-to-End Automation & Screenshot Verification**: An automated Playwright script (`scripts/screenshots.mjs`) logs into the running application under real credentials across multiple personas (`prabha`, `newbie`, `admin`), checks for absence of loading skeletons, and captures all 18 production screens under desktop (1366×768) and mobile (390×844) viewports.

---

## 8. Known Limitations

1. **Complex Mobile Graph Interaction**: While mobile dashboard and timeline pathways adapt cleanly, visualizing dense graphs (40+ nodes, 50+ edges) on 390px screens is optimized for pan and zoom rather than full in-canvas manipulation.
2. **Dagre Re-layout Calculation**: Dynamic graph layout computations on large subgraphs require careful memoization to avoid frame drops during pan gestures.
3. **Chunked Assistant Replies**: The AI Assistant receives complete grounded messages in a single response envelope rather than a streaming SSE token connection.

---

## 9. Likely Viva Questions & Honest Answers

### 1. Why did you choose TanStack Query over a global state library like Redux or Zustand?
Redux and Zustand are designed for client-side state, which only represents a tiny fraction of our app (primarily auth session and UI modal toggles). More than 95% of SkillGraph's state is **server state** (skill graphs, career fit scores, learning paths). TanStack Query provides out-of-the-box caching, deduplication, automatic background revalidation, and declarative invalidation cascades (`invalidateAnalysis`), eliminating hundreds of lines of boilerplate reducers and action creators.

### 2. How does the frontend decide how to color each node in the Skill Graph?
Node coloring is determined strictly by the rule engine output returned from `/api/analysis/graph`. The frontend never calculates scores or statuses locally; it reads the node's `state` field and maps it to design tokens: `recommended` (violet, if in top-3 next skills), `mastered` (green, gap = 0), `partial` (amber, proficiency > 0 but below required), and `missing` (red, proficiency = 0).

### 3. How do you protect private routes and enforce role-based permissions?
Routes are wrapped in higher-order guard components in `router.jsx`. `ProtectedRoute` checks the `useAuth` context; if unauthenticated, it redirects to `/login?next=<path>`. If authenticated but `onboardingCompleted` is false, it forces the user to `/onboarding`. `AdminRoute` specifically asserts `user.role === 'admin'`; non-admin attempts are intercepted with a dedicated, friendly 403 Forbidden screen.

### 4. How does Dagre layout integrate with React Flow without triggering infinite re-render loops?
Dagre requires node dimensions and edge lists to compute `(x, y)` coordinates. In `SkillGraph.jsx`, the layout computation (`layoutGraph`) is wrapped in a `useMemo` hook that depends only on the raw graph `data` from the API. Position coordinates are computed once per data change; user actions like selecting nodes or panning simply center the existing viewport using React Flow's `setCenter` API without mutating layout node arrays.

### 5. How do you handle optimistic UI updates when a student changes a skill proficiency level?
In `LearningPath.jsx` and `SkillDetailPanel.jsx`, the `LevelPicker` updates local component state immediately and displays a subtle loading indicator. `useUpdateSkill` dispatches `PATCH /api/users/me/skills/:slug`. If the API responds with success, the server cache is invalidated and the updated alignment score animates in; if the request fails, the component automatically catches the error, reverts the picker to its prior value, and displays a retry toast.

### 6. Why did you adopt an editorial neo-brutalist design system instead of standard component kits like Tailwind UI or Material UI?
Neo-brutalism uses high-contrast borders, warm paper tones, bold display typography, and tactile hard shadows. For an academic and career guidance platform, this aesthetic creates strong visual clarity and deliberate hierarchy, avoiding the generic corporate look of off-the-shelf component libraries while making state distinctions (mastered, developing, missing) immediately identifiable.

### 7. How does the frontend prevent prompt injection and protect user LLM API keys?
The frontend never talks directly to OpenRouter or accepts raw system prompts from students. User chat messages are submitted to the backend orchestrator, which validates inputs against an intent allow-list and synthesizes responses using server-side grounding facts. When a student enters their own OpenRouter key in Settings, it is sent once over HTTPS, encrypted with AES-256-GCM at rest, and masked immediately—the frontend only ever receives boolean confirmation (`hasKey`) and the last four characters.

### 8. If you had two more weeks on this project, what would you improve on the frontend?
First, I would implement token streaming (Server-Sent Events) for the AI assistant to provide real-time typewriter feedback. Second, I would add an interactive minimap and node clustering for the Skill Graph on tablet and mobile viewports. Third, I would introduce offline caching with Service Workers so students can inspect their curriculum roadmap even with unstable network connectivity.
