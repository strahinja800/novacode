# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run CLI in watch mode
bun run dev:cli

# Lint
bun run lint

# Lint with auto-fix
bun run lint --fix

# Type check
tsc --noEmit
```

## Architecture

NovaCode is a terminal UI AI coding assistant built as a **Bun monorepo** (`packages/*`).

**Runtime:** Bun (not Node.js). Use `bun add` for dependencies, never `npm` or `yarn`.

**UI layer:** [`@opentui/react`](https://github.com/nicholasgasior/opentui) — a React renderer for the terminal. Components use JSX but render to terminal primitives (`<box>`, `<text>`, `<textarea>`, `<ascii-font>`), not HTML. `jsxImportSource` is set to `@opentui/react` in tsconfig.

**Entry point:** `packages/cli/src/index.tsx` — creates a CLI renderer via `@opentui/core` and mounts the React tree.

**Path alias:** `@/` maps to `packages/cli/src/` (configured in `packages/cli/tsconfig.json`). Prefer `@/` over relative imports that traverse folders.

**ESLint:** Flat config (`eslint.config.mjs`) at repo root, targets `packages/cli/src`. Uses ESLint 9 (v10 is incompatible with `eslint-plugin-no-relative-import-paths`).
