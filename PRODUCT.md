# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Solo builders and indie hackers — one-person shops shipping fast. They work
directly in a terminal, alternate between writing code and delegating chunks of
it, and care more about speed and visible cost than deep configurability.

NovaCode is currently built as a personal learning project exploring terminal UI
design with `@opentui/react`. The solo-builder audience is the design target, not
a served user base with commitments to honor.

## Product Purpose

A terminal UI AI coding assistant. The visitor opens it inside their existing
terminal workflow, describes a task in natural language, and picks the agent and
model that should handle it.

Success for this project is currently twofold and should be read in that order:

1. The TUI itself is well-built and pleasant to use.
2. It is a credible foundation for a real assistant if the project continues.

## Positioning

**Undecided.** No differentiating mechanism has been committed. The strongest
candidates visible in the code are named agents bound to switchable models, and
browsable session history — but neither has been chosen, and future work must not
state or imply a positioning claim that has not been decided here.

Do not fabricate a competitive claim against Claude Code, Codex, opencode, or any
other assistant.

## Operating Context

- Runs in a terminal emulator, typically alongside an editor, a shell, and a
  running dev server. Frequently inside tmux or an SSH session.
- Keyboard-driven end to end. Mouse support exists in the command menu but is
  never the assumed input.
- Rendering is constrained by terminal cell geometry: monospace only, integer
  rows and columns, no subpixel layout, and a width the user controls and can
  shrink at any time.
- Color fidelity depends on the terminal. Truecolor is used today; degraded
  palettes are a real environment, not an edge case.

## Capabilities and Constraints

**Built today:** app shell with centered layout, ASCII wordmark header, a
multiline textarea input bar with placeholder, a slash-command menu that filters
as you type and supports keyboard and mouse selection, a status bar showing the
active agent and model (`Build › opus-4-6`), and a toast provider for transient
feedback.

**Command surface (scaffolding, not commitments):** `/new`, `/agents`,
`/models`, `/session`, `/theme`, `/login`, `/logout`, `/upgrade`, `/usage`,
`/exit`. Only `/exit` does real work; the rest fire a toast. The account and
billing commands (`/login`, `/logout`, `/upgrade`, `/usage`) are placeholders —
there is no hosted service, no account system, and no paid plan. Future work must
not present them as shipped features or write copy that implies they are.

**Not built:** the assistant itself. There is no model call, no conversation
transcript, no streaming, no tool use, no file editing, and no session
persistence. `onSubmit` is currently a no-op.

**Technical constraints:**

- Bun monorepo (`packages/*`); Bun is the runtime and package manager, never npm
  or yarn.
- `@opentui/react` renders to terminal primitives (`<box>`, `<text>`,
  `<textarea>`, `<ascii-font>`, `<scrollbox>`) — not HTML. No CSS, no web fonts,
  no images, no SVG, no arbitrary vector geometry.
- `@/` path alias maps to `packages/cli/src/`.
- ESLint 9 flat config at repo root. TypeScript checked with `tsc --noEmit`.
- The full detail lives in [CLAUDE.md](CLAUDE.md); it is authoritative for
  commands and stack, and this file must not contradict it.

**Undecided:** positioning; whether the product ships publicly; whether models
are hosted or bring-your-own-key; the agent taxonomy beyond the `Build` label
appearing in the status bar; and whether `/theme` implies a real multi-theme
system or a single committed look.

## Brand Commitments

- **Name:** NovaCode. Rendered in the header as two ASCII words — `Nova` dimmed,
  `Code` at full weight. This split treatment is the existing identity gesture.
- No logo, no wordmark asset, no voice guide, and no committed palette. Nothing
  here is binding beyond the name and the two-tone wordmark split.

## Evidence on Hand

Working code in [packages/cli/src/](packages/cli/src/) is the only evidence.

There are no users, no testimonials, no benchmarks, no press, no case studies, no
pricing, no deployment, and no public release. Future work must not invent any of
them, and must not write marketing copy that assumes an audience exists.

## Product Principles

1. **Keyboard flow is the product.** Every capability must be reachable and
   fast without a mouse. Mouse support is an accommodation, never the design
   center.
2. **Respect the terminal's physics.** Design within monospace cells, integer
   rows, user-controlled width, and variable color support — treat the medium as
   the material, not as a limitation to fight.
3. **Never overclaim.** The assistant does not work yet and the billing surface
   is scaffolding. Copy and UI must not imply capability that does not exist.
4. **The interface recedes during work.** The visitor is thinking about their
   code. Chrome earns its rows; anything that does not help them get a task
   delegated is a candidate for removal.
5. **Craft over feature count.** This project's stated success is a well-built
   TUI. Depth on the few surfaces that exist beats breadth across stubs.

## Accessibility & Inclusion

No product-specific standard has been established. Two medium-imposed needs are
factual rather than aspirational: the UI must stay legible when the terminal
offers a reduced color palette, and color must never be the only carrier of state
(selection, agent, or toast variant), since terminal themes vary per user.
