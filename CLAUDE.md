# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — start Next.js dev server (assume already running; do not launch)
- `pnpm build` — production build
- `pnpm lint` — run ESLint (`eslint-config-next`)
- `npx tsc --noEmit` — type check only (no test suite in this repo)

Package manager is **pnpm** (respect `pnpm-lock.yaml`).

## Stack

Next.js 16 App Router + React 19 + TypeScript, Tailwind CSS v4 (zero-config), InstantDB for data + auth, Zustand for client state, Recharts, lucide-react icons. Dark "Midnight Ledger" theme.

## Architecture

### Data layer — InstantDB is the single source of truth

`lib/instant.ts` defines the schema and exports `db` + `id`. All entities (`members`, `incomes`, `expenses`, `deposits`, `metals`, `securities`, `goals`) carry a `userId` field and are queried with `$: { where: { userId } }` to enforce per-user data isolation. There is no backend — mutations go directly through `db.transact(db.tx.<entity>[id].update(...))`. When adding a field to an entity, update `lib/instant.ts` and handle legacy records that pre-date the field (treat missing as empty string / default).

Auth uses InstantDB magic-link (email code). `components/auth-gate.tsx` wraps the app in `app/layout.tsx` and gates all routes; inside any component, `db.useAuth()` gives `user.id` which becomes the `userId` filter.

### Client state — Zustand (`lib/store.ts`)

`useFamilyStore` holds ephemeral UI state that doesn't belong in the DB: `activeMemberId` (member filter applied across income/expense/asset views), live FX `rates`, live `metalPrices` (gold/silver), and sidebar state. `components/providers.tsx` fetches `/api/rates` and `/api/metals` on mount and hourly, populating the store.

### Currency conversion

All display values are CNY. Use `toCNYDirect(amount, currency, rates)` from `lib/utils.ts` — rates are USD-based (`rates[CCY]` is units per USD), so conversion goes `amount / rates[CCY] * rates['CNY']`. For metals, `getMetalValueCNY` prefers live spot prices and falls back to stored purchase price.

### Recurring income/expense generation

`hooks/use-recurring-auto-gen.ts` is the shared engine for both income and expense recurring templates. Templates have `recurring: true`; generated records have `recurring: false` and `recurringSourceId` pointing back to the template.

- For **incomes** with `startDate` (YYYY-MM), the hook backfills every month from `startDate` to `min(endDate, currentMonth)`. This is how salary periods with mid-year job changes work (end the old template, start a new one).
- For **expenses** (and legacy income templates without `startDate`), only the current month is generated — legacy fallback.
- Idempotency: the hook checks for any existing record matching `recurringSourceId + month` before inserting, and also caches processed keys in a ref across re-renders. Editing a template's amount therefore only affects **future** months — existing generated records are never overwritten.

When deleting a salary template, cascade-delete all records where `recurringSourceId === template.id` (see `deleteTemplate` in `income-manager.tsx`).

### Manager components

Each feature page (`app/{income,expenses,assets,members,goals}/page.tsx`) is a thin wrapper around a manager component in `components/`. The managers own their modal form state, validation, and transactions directly — no intermediate service layer. `income-manager.tsx` is the canonical example of the two-mode pattern (template vs. one-off) and should be mirrored when adding similar flows.

The list display rule (per user preference): auto-generated records must **not** duplicate under the template card. Show templates in their own section, and filter `!recurringSourceId` when rendering the flat record list. Monthly stats still include all records (templates + generated + one-off).

## Conventions enforced by the user

- `any` forbidden.
- No browser `alert`/`confirm`/`prompt` — use the `Modal` in `components/modal.tsx` or inline two-step confirm state (see template delete).
- Icons only from `lucide-react`.
- Server Components by default; `'use client'` only when required.
- Server Actions for mutations where server runtime is needed; client-direct `db.transact` is fine because InstantDB handles auth/permissions client-side.
- Do not create comments explaining what code does; only non-obvious **why**.
- Address the user as "阿荒" at the start of replies (global rule).

## Windows / Git Bash

Shell is Git Bash on Windows. Use `/dev/null` for redirects, not `nul` (Git Bash treats `nul` as a filename and creates an undeletable reserved-name file).
