# Industrial Data Monitoring Dashboard

A single page Industrial Symbol Monitoring Dashboard that connects to a REST API to visualize and manage real-time device metrics. It authenticates against the device's REST API using a Basic Auth to Bearer token flow, polls a configurable set of integer symbols on an interval user choose and builds a 5 minute rolling history for client side, and lets users search, sort, export, and get detailed information for each individual symbols.

---

## Mock server - Enabled For this Stage of Programming challenege

The mock here is a Vite middleware plugin (`src/dev/mockServer.ts`) that implements the exact same endpoints and response shapes the real device exposes on Private IP (https://192.168.3.2) :

- `GET /api/v1/auth/token` — returns a bearer token (any username/password is accepted in demo mode)
- `GET /api/v1/logic-engine/symbols` — returns the symbol list with PascalCase fields, including a couple of `INT` rows so the client-side `Type === 'INS'` filter has something to drop
- `GET /api/v1/logic-engine/symbols/:name` — returns `stVal`, `q`, `t`, `range`, `units`, `multiplier`, and `d` as per the spec of challenge document.

For now I have the mock simulates 50 realistic relay symbols (voltages, currents, temperatures, counters, etc.) using a mean reverting random walk so values move visibly but stay near their base. Three simulated behaviors are mixed in so all three status pills show up at once during the demo:

- Most symbols respond normally and stay **Active**.
- Three symbols are **flaky** . They respond for a 15 second window every 90 seconds, with each one's window offset so at any moment one is Active, one Stale, and one Inactive.
- Two symbols are permanently **down** (always 404), so their rows go Inactive immediately.

So that each scenario mentioned in the challenge document can be verfied.


---

## Tech stack

- **React 18** + **TypeScript** (strict mode, `noUncheckedIndexedAccess`)
- **Vite 5** for dev and build
- **Axios** with request and response interceptors
- **Bootstrap 5** grid (`bootstrap-grid.min.css`) + **Bootstrap Icons** for layout and iconography
- **Chart.js** (via `react-chartjs-2`) for the historical line chart
- **react-i18next** with English and Spanish translation bundles
- **CSS Modules** + CSS custom properties for theming (light / dark / auto)
- **Vitest** + **React Testing Library** + **jsdom** for unit/component tests
- **Playwright** for end-to-end browser tests (Chromium)
- **nginx** in production, with `/api/` proxied to the dashboard

---

## Setup

### Prerequisites

- Node.js 18+
- npm 10+

### Install

```bash
npm install
```

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `VITE_DEMO` | _(unset)_ | Set to `1` to activate the in-process mock server middleware |
| `VITE_API_TARGET` | `https://192.168.3.2` | Override the device IP the Vite proxy (and nginx) forwards `/api/*` to |

### Run with the mock server (recommended for this submission)

```bash
npm run dev:demo
```

This starts Vite with `VITE_DEMO=1`, which registers the in process mock middleware. Open `http://localhost:3000` and log in with any credentials, the mock accepts everything.

### Run on a Real Server

```bash
npm run dev
```

Vite proxies `/api/*` to `https://192.168.3.2` with `secure: false` to accept its self-signed cert. To point at a different device:

```bash
VITE_API_TARGET=https://10.0.0.42 npm run dev
```

### Unit and component tests (Vitest)

```bash
npm run test            # CI run (all 67 specs)
npm run test:watch      # interactive watch mode
npm run test:coverage   # writes HTML + lcov to ./coverage
```

The suite covers 67 specs across 10 test files: the two main views (`SymbolsDashboard`, `SymbolDetailView`), the login form (`AuthenticationForm`), shared UI components, the `useSymbolPolling` hook, API and storage services, CSV export, value formatters, and i18n string completeness. The HTML report is at `coverage/index.html`.

### End-to-end tests (Playwright)

```bash
npm run test:e2e        # headless Chromium run
npm run test:e2e:ui     # Playwright UI mode (interactive, with time-travel)
npm run test:e2e:debug  # step-through debugger
```

The E2E suite has 21 tests across three spec files. All API calls are intercepted with `page.route()` so the tests run without the mock server or a Real Server.

| File | Coverage |
|------|----------|
| `auth.spec.ts` | Login form rendering, field validation, URL format error, 401 response, successful login, button disabled state during request |
| `dashboard.spec.ts` | Connection status bar, symbol table population, search filter and clear, start/stop polling toggle, detail panel open on row click, CSV export button state, logout confirmation flow |
| `settings.spec.ts` | Panel open/close (Escape and click-outside), Spanish translation, English restore, theme active state, auto-start-polling checkbox persistence |

Playwright is configured in `playwright.config.ts`. It runs up `npm run dev` automatically if no server is already running on port 3000, so a clean `npm run test:e2e` works out of the box. In CI, retries are set to 2 and workers to 1.

### Production build

```bash
npm run build
npm run preview
```

### Docker

**Demo (Vite dev server + in-process mock)** (recommended for this submission)

```bash
docker compose up --build demo
```

Running `Dockerfile.demo` installs deps, starts the Vite dev server with `VITE_DEMO=1 --host` so the in process mock is active. Open `http://localhost:3000` and log in with any credentials. No real device or network access needed.

**Production (nginx + Real Server)**

```bash
docker compose up --build app
```

Builds the SPA, serves it from nginx on port 5173, and proxies `/api/` to `https://192.168.3.2` with `proxy_ssl_verify off`.



---

## Default credentials (lab device)

```
Server   https://192.168.3.2
User     testuser
Pass     testpass
```

In demo mode any username and password will work. The real device uses Basic Auth and issues a Bearer token that lasts one hour.



---

## Project layout

```
src/
├── components/        UI components + css/ (co-located .module.css files)
├── dev/               mockServer.ts — Vite plugin, dev-only, VITE_DEMO=1 only
├── hooks/             useSymbolPolling — polling and orchestration
├── services/          apiService (axios + interceptors), storageService (typed localStorage)
├── i18n/              react-i18next config, en + es JSON bundles, namespace types
├── styles/            theme.css (CSS variables), globals.css (shared utilities)
├── types/             API and domain type definitions
├── utils/             formatters (status / time / number) and CSV export
├── tests/
│   ├── unit/          Vitest specs (services, hook, components, i18n)
│   └── e2e/           Playwright specs (auth, dashboard, settings) + helpers.ts
├── App.tsx            Top-level shell — wires auth, polling, dashboard, modal
└── main.tsx           Entry point
```



### Key design decisions

**Polling lives in the hook, not the service.** The service is stateless and returns plain promises. The hook owns the timer, cancellation, history accumulation, and stale detection. That split kept the polling tests and the API tests genuinely independent.

**Status is derived, not stored.** A symbol's `Active / Stale / Inactive` label comes from `Date.now() - lastUpdated.getTime()`, computed at render. The hook only stores the last received value. 

**History is built client-side with a hard cap.** The spec is clear that there's no history endpoint. Each successful poll appends a `SymbolHistoryPoint` and this trim by both age (5 min) and count (50 points). The chart reads directly from this map.

**Every fetch is cancellable.** Each polling batch carries an `AbortController`. When the interval changes or the component unmounts, in-flight requests are aborted rather than resolving into stale state.

---

## Features implemented

- [x] Basic Auth to Bearer token flow with auto injection and 401 cleanup
- [x] Token persistence with expiry validation on page reload
- [x] Symbol dashboard: search, two-column sort, pagination (10 / 25 / 50)
- [x] Real-time polling at 1s / 2s / 5s / 10s, with start / stop and manual refresh
- [x] `Active / Stale / Inactive` status pill derived live from `lastUpdated`
- [x] Symbol detail modal: live values, Chart.js line chart, full quality breakdown
- [x] CSV export of the currently filtered and sorted view
- [x] Connection status bar with last poll relative time
- [x] Light / Dark / Auto themes via CSS custom properties
- [x] Internationalization (English + Spanish, fully translated)
- [x] LocalStorage persistence for theme, language, polling interval, and credentials hint
- [x] Error toasts and inline banners for transient failures
- [x] Confirmation dialog for logout
- [x] Keyboard support (Enter to submit, Escape to close modals, focusable rows)
- [x] Accessible: ARIA labels, `aria-sort` on sortable headers, `aria-live` regions for toasts
- [x] Vitest Coverage
- [x] Playwright E2E suite, 21 tests covering auth, dashboard, and settings flows
- [x] Multi-stage Dockerfile + nginx config + docker-compose

### Optional enhancements implemented

- **Internationalization** — English and Spanish translation bundles via `react-i18next`, language selection persists to `localStorage` and updates `<html lang>`.
- **End-to-end tests** — 21 Playwright tests across three spec files (auth, dashboard, settings) using `page.route()` interception so no live server is required.

---

## Known Issues / Future Improvements

**Advanced filtering.** The current search is name only. A proper filter panel would let operators narrow the table by status (Active / Stale / Inactive), quality (`good` / `invalid` / `questionable`), value range, or engineering units. For a live monitoring view, being able to isolate all stale or out of range symbols in one click is meaningfully and more useful than a name search alone.

**No threshold alerting.** The detail view already surfaces `range.min` / `range.max` from the API, but nothing acts on them. An enhancement can be a per symbol alert rule that fires a toast (or highlights the row) when the live value crosses a configured threshold which useful in an industrial context where out of range conditions may matter.

**WebSocket not Setup.** Polling works fine for now, but if the device gains a push endpoint it would slot into `useSymbolPolling` cleanly , the hook is the only place that owns the timer and data shape, so the components wouldn't change at all. 

**No exponential backoff on failures.** The spec says not to implement retry, so I didn't. If that constraint lifted, adding jittered backoff to `apiService` would be straightforward and would keep the polling alive through short network hiccups without hammering a device that's already stressed.

**History.** The 5-minute rolling window lives in React state , a page refresh wipes it. Persisting history to `localStorage` or `IndexedDB` on each poll tick would survive a reload without any changes to the hook's external contract.

**`App.tsx` is excluded from unit coverage.** It's a thin shell that wires together pieces that each have their own tests. The Playwright E2E suite covers the full login to dashboard to detail flow end to end, which exercises the `App.tsx` wiring more naturally than a unit test would.

---

## Time spent

Roughly 10–11 hours total: setup and types (~1h), service + hook (~2h), components and styling (~3h), i18n (~1h), tests + coverage (~2h), Docker + mock server + README + polish and Playwright testing (~2h).

---

## Notes and assumptions

**`Promise.allSettled` instead of `Promise.all`.** The spec document suggests `Promise.all` for the polling batch, but `Promise.allSettled` is used instead. This means a single failing symbol fetch never aborts the rest of the batch and every successful response still updates the table. The choice aligns with the spec's own requirement to "handle individual symbol failures gracefully."

**Token expiry is validated on client-side.** On page load, the service restores a token from `localStorage` only if `Date.now() < storedExpiry`. The expiry epoch is computed at authentication time from `ExpiresIn` (seconds) returned by the API. A token that has expired while the tab was closed is discarded silently and the user is sent back to the login screen.

**No `any` types.** TypeScript strict mode is enabled with `noUncheckedIndexedAccess`. Where the spec's own interfaces would permit `any` (e.g., `rawData`), `Record<string, unknown>` is used instead and narrowed at the point of use.


**The browser never contacts the device directly.** In development the Vite dev proxy handles all `/api/*` traffic and in production nginx does. This means the device's self-signed TLS certificate never causes a browser warning and the browser only ever sees the proxy's certificate.

**`INS` filter is applied on the raw API field before camelCase mapping.** `getSymbols()` filters `item.Type === 'INS'` on the raw PascalCase response before converting to camelCase. This matches the challenge spec's note to "filter on the raw API field."

----

