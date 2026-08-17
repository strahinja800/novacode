---
name: NovaCode
description: A terminal coding assistant that lives inside the night the developer already works in.
colors:
  ground: "ansi:default-bg"
  raised: "ansi:0"
  overlay: "ansi:8"
  fg: "ansi:default-fg"
  muted: "ansi:7"
  inverse: "ansi:0"
  accent: "ansi:6 (themed)"
  selection: "ansi:4 (themed)"
  state-success: "ansi:2"
  state-error: "ansi:1"
  state-info: "ansi:6"
typography:
  display:
    fontFamily: "opentui ascii-font 'tiny'"
    fontSize: "3 rows"
    letterSpacing: "0.5 cell between words"
  body:
    fontFamily: "terminal monospace (inherited from the user's emulator)"
    fontSize: "1 cell"
  muted:
    fontFamily: "terminal monospace (inherited from the user's emulator)"
    fontSize: "1 cell"
    fontWeight: "DIM attribute"
spacing:
  hairline: "0.5"
  sm: "1"
  md: "2"
components:
  app-shell:
    backgroundColor: "{colors.ground}"
    width: "100%"
    height: "100%"
    padding: "{spacing.md}"
  input-bar:
    backgroundColor: "{colors.raised}"
    borderColor: "{colors.accent}"
    padding: "{spacing.sm} {spacing.md}"
    width: "100%"
  command-menu:
    backgroundColor: "{colors.overlay}"
    width: "100%"
    height: "8"
  command-row:
    textColor: "{colors.fg}"
    padding: "0 {spacing.sm}"
    height: "1"
  command-row-selected:
    backgroundColor: "{colors.selection}"
    textColor: "{colors.inverse}"
    height: "1"
  command-row-description:
    textColor: "{colors.muted}"
    height: "1"
  status-bar:
    textColor: "{colors.accent}"
    height: "1"
  toast:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.fg}"
    padding: "{spacing.sm} {spacing.md}"
    width: "60"
  dialog:
    backgroundColor: "{colors.overlay}"
    borderColor: "{colors.accent}"
    padding: "{spacing.sm} {spacing.md}"
    width: "64"
  dialog-search-list:
    height: "6"
  theme-row-marker:
    textColor: "{colors.accent}"
    width: "2"
---

# Design System: NovaCode

## Overview

**Creative North Star: "The Night Console"**

NovaCode does not paint a dark theme. It assumes the night that is already
there. A solo builder running this at 2am has their emulator dialed in exactly
how they like it, and the assistant arrives as a quiet console inside that
existing dark, not as an application that repaints the room. Everything here
follows from that posture: the ground *is* the terminal's own background, chrome
earns every row it occupies, and a single accent rule down the left edge of the
input is the only thing in the frame that behaves like a light source.

The system is deliberately poor in effects, because the medium is poor in
effects. There is no shadow, no blur, no gradient, no radius, no font size, and
no weight. Depth exists only as three flat tones stacked on each other. Hierarchy
exists only as color, the DIM attribute, and one ASCII wordmark that is allowed
to be three rows tall. Working inside that poverty is the discipline of the
system, not a limitation it apologizes for.

The character is restrained and precise. Components read as instruments that have
been tuned rather than surfaces that have been styled: partial borders instead of
frames, one-row list items, a status line that states the agent and model and
nothing else. When the visitor is thinking about their code, the interface should
be the least interesting thing on the screen — and then be immediately exact the
moment they reach for it.

**Key Characteristics:**

- Every color is a palette reference; the terminal owns the actual values
- Three flat surfaces, no shadows, no elevation vocabulary at all
- One rationed accent as a light source, never as decoration
- The left border rule — partial borders, never a closed box
- One-cell typography; hierarchy carried by color and DIM, never by size
- A three-step spacing scale (0.5 / 1 / 2 cells) and nothing between
- Chrome that recedes during work and resolves instantly on demand

## Colors

There is no palette in this system. There is a set of **roles**, and each role
points at a slot in the user's terminal palette. What the interface actually
looks like is decided by the emulator, which is the entire point of the north
star.

### How a color is declared

Colors are constructed, never written as strings:

- `RGBA.fromIndex(n)` — a reference to ANSI palette slot `n`. The renderer emits
  a palette index and the terminal substitutes its own value.
- `RGBA.defaultBackground()` / `RGBA.defaultForeground()` — the terminal's own
  default ground and text color.

**A bare string is not an ANSI role.** OpenTUI resolves `'cyan'`, `'gray'`,
`'white'` and friends through a fixed internal hex table, so a named string is a
hard-coded hex value wearing a friendly name and the terminal never gets a say.
This distinction is the single most important implementation fact in the system,
and getting it wrong silently defeats the north star while appearing to honor it.

### Surfaces

- **Ground** (`default background`): the app shell. Not a near-black panel — the
  terminal's actual background, showing through. The interface sits *in* the
  user's night rather than on top of it.
- **Raised** (`slot 0`, black): the input bar and the toast. The one step of lift
  the resting interface is allowed.
- **Overlay** (`slot 8`, bright black): the command menu and the dialog. A
  floating layer is distinguishable from a resting one without any border or
  shadow.

### Text

- **Foreground** (`default foreground`): command names, input text, the model
  name. The default state of all text, and by definition already correct against
  the user's ground.
- **Muted** (`slot 7`): descriptions, the recessed half of the wordmark, the `›`
  separator. Paired with the DIM attribute wherever the element accepts
  attributes.
- **Inverse** (`slot 0`): text on a selected row, where the selection fill
  inverts the row.

### Accent and Selection

- **Accent** (themed, `slot 6` by default): the system's only light source. It
  marks the active input's left rule, the active agent in the status bar, and the
  dialog's left rule. Nothing else in the resting interface may carry it.
- **Selection** (themed, `slot 4` by default): the selected row fill in the
  command menu and every dialog list. The only saturated field in the system, and
  it exists for exactly one row at a time.

### State

**Confirm** (`slot 2`), **Alert** (`slot 1`), **Info** (`slot 6`): toast left and
right borders. Transient only; none of these three may appear in resting chrome.

### Named Rules

**The Terminal's Theme Wins Rule.** Every color in the system is a palette
reference or a terminal default. There are no hex values anywhere in `src/`, and
that is a verifiable property, not an aspiration:

```bash
grep -rE '#[0-9a-fA-F]{6}' packages/cli/src   # must return nothing
```

Reaching for a hex value, or for a named color string, requires a reason that
survives a 16-color terminal — and so far no such reason has come up. Because the
terminal is the authority, the system cannot guarantee any particular contrast
ratio; it guarantees only that it never fights the profile the user already
chose. The compensating discipline is The Never-Only-Color Rule.

**The One Cyan Rule.** The accent appears at most twice on a resting screen: the
active input's left rule, and the active agent. A dialog's left rule replaces
neither — while a dialog is open it owns the accent budget, because the input
behind it is no longer the thing being acted on. If a third accent element is
proposed, something else gives it up first. Its rarity is what makes it read as
attention rather than as branding.

**The Never-Only-Color Rule.** No state may be carried by color alone. The
selected row inverts its fill *and* its text; a toast variant tints its border
*and* is a transient overlay that was not there a moment ago; a muted line takes
the DIM attribute *and* a recessed role. This rule carries more weight here than
in most systems, because the palette is genuinely out of our hands — a user on a
high-contrast or remapped profile must still be able to read every state.

## Theming

The theme is a **complete set of role values**, selected at runtime and
remembered between sessions. Four presets ship today.

Every preset shares one surface and text vocabulary and differs only in which
slot carries the accent and the selection. That is a deliberate consequence of
staying on the palette: there is no room for bespoke ramps, and the restraint
matches the rationing already imposed on the accent.

| Preset | Accent | Selection |
| --- | --- | --- |
| Night Console | `slot 6` cyan | `slot 4` blue |
| Ember | `slot 3` yellow | `slot 1` red |
| Moss | `slot 2` green | `slot 10` bright green |
| Orchid | `slot 5` magenta | `slot 13` bright magenta |

The choice persists to `~/.novacode/preferences.json`. Preferences are advisory:
a missing file, malformed JSON, or an unknown theme name all resolve to the
default rather than blocking startup, and unrelated keys in that file survive a
write.

### Named Rules

**The Preview Is Reversible Rule.** Moving the highlight through the theme list
repaints the whole interface immediately, because a swatch cannot show what a
palette reference will actually look like — only the real interface can.
Dismissing the dialog therefore restores whatever was active when it opened.
Preview applies without remembering; only a confirmed choice writes to disk.

**The Anchor Survives The Preview Rule.** Because previewing repaints
everything, the interface itself stops being evidence of which theme is
persisted. The theme list therefore marks the saved theme with a `•` in a fixed
2-cell column, in the accent. The marker tracks the persisted choice, never the
highlight — it is the one fixed point the visitor can navigate back to, and it is
a glyph rather than a color precisely because the colors are the thing in motion.

**The Preset Earns Its Difference Rule.** Two presets that resolve to visually
similar slots on a common profile are one preset. Since the terminal decides the
actual hues, a new preset must be justified by a distinct *slot*, not by an
intended color.

## Typography

**Display Font:** opentui `ascii-font` at `tiny` — the wordmark only
**Body Font:** the user's terminal monospace, inherited and never overridden

**Character:** There is exactly one typeface and exactly one size, because the
terminal grants exactly one of each. The system's entire typographic range is
three settings: full-brightness foreground, DIM, and the three-row ASCII
wordmark. Restraint here is not a style choice; it is the material.

### Hierarchy

- **Display** (`ascii-font` `tiny`, 3 rows): the `NovaCode` wordmark at the top
  of the shell. The only element permitted more than one row of vertical type.
  `Nova` renders in Muted and `Code` in Foreground — the two-tone split is the
  identity gesture and must survive any restyling.
- **Body** (1 cell, Foreground): command names, the input text, the model name in
  the status bar. The default state of all text.
- **Muted** (1 cell, DIM attribute): command descriptions, the status separator,
  dialog titles, empty-state messages. Applied to anything the visitor is not
  acting on.

### Known Tension

`ascii-font` accepts a color but not text attributes, so the wordmark's recessed
half cannot use DIM and leans entirely on the gap between slot 7 and the
terminal's default foreground. On profiles where those two are close, the
two-tone gesture weakens. This is the one place in the system where a role
carries a distinction alone, and it is accepted because the wordmark is
decorative — no state depends on reading it.

### Named Rules

**The One Cell Rule.** Every glyph outside the wordmark occupies exactly one
cell. Hierarchy is produced by color and the DIM attribute, never by size or
weight, because neither exists here. A design that needs a bigger heading needs a
different idea instead.

**The Wordmark Stays Put Rule.** The ASCII wordmark is the single decorative
element in the system and it earns its three rows only at the shell's top. It
does not recur in menus, toasts, dialogs, or headers of any sub-surface.

## Layout

The shell is a single centered column. Content is capped at **78 cells** of width
with **2 cells** of horizontal padding, so the interface holds a readable measure
on a wide terminal instead of stretching to fill it, and degrades to full width
on a narrow one. The shell centers on both axes with a **2-cell** gap between the
wordmark and the input.

Spacing is a three-step scale in terminal cells and nothing else exists between
the steps: **0.5** (the wordmark's inter-word gap), **1** (the gap between the
input and its status bar, the toast's vertical padding, list-row horizontal
padding, the gap between a dialog's title and its body), and **2** (the shell gap
and all horizontal panel padding).

The command menu is a floating layer anchored to the **bottom of the input**,
full width, at `zIndex` 10, capped at **8 visible rows** and scrolling beyond
that. Rows are exactly **1 cell tall** with `overflow: hidden`, and split into a
fixed **11-cell** name column (the longest command name plus 4) and a flexible
description column that truncates. The fixed column is what makes the list scan
vertically.

The dialog is centered on both axes over a full-shell layer at `zIndex` 20, sized
`min(64, terminalWidth - 6)`. Its list caps at **6 visible rows** — two fewer
than the command menu, because a dialog also spends rows on a title and a filter
input.

The toast is absolutely positioned at **top 2, right 2**, sized
`min(60, terminalWidth - 6)` so it never touches the frame edge on a narrow
terminal, and word-wraps inside that width.

Terminal width is user-controlled and can change at any moment. Every layout must
survive a narrow window: fixed columns need a flexible sibling, and any absolute
element needs a `min()` clamp against the live terminal width.

## Elevation & Depth

**There are no shadows, and there cannot be.** The terminal has no compositing,
no blur, and no alpha. Depth is produced entirely by tonal layering across three
flat surfaces: the terminal's own background for the ground, slot 0 for resting
panels, and slot 8 for floating layers.

Because the ground is the terminal's background rather than a chosen tone, the
ground-to-raised step is the one the system cannot control. On a profile whose
background is already close to slot 0, the input bar separates from the shell by
its accent rule rather than by tone — which is why that rule is structural and
not decoration. Stacking order and partial borders carry the hierarchy the tones
cannot guarantee.

The command menu is absolutely positioned above the input at `zIndex` 10; the
dialog layer sits at `zIndex` 20; the toast is absolutely positioned against the
shell. Nothing else in the system leaves the flow.

### Named Rules

**The Three Surfaces Rule.** Ground, raised, overlay. That is the entire depth
vocabulary. A fourth tone means the hierarchy is wrong, not that the palette is
short — and on the ANSI palette there is no fourth tone available anyway.

**The Flat Forever Rule.** No shadow, no glow, no gradient, no border to fake
elevation. If a surface needs to feel closer, it moves up one tone or it gets a
partial border — those are the only two moves available.

## Shapes

Terminals have no corner radius, so form language here is entirely about **which
edges exist**. The system's answer is: as few as possible.

The signature is the **partial border**. The input bar carries a border on its
**left edge only**, in `rounded` style and the accent — a single vertical rule
beside the text rather than a box around it. The dialog carries the same single
left rule. The toast carries **left and right** borders in its variant color,
bracketing the message. No component in the system draws a complete box.

Surfaces are otherwise defined by their background tone alone. The command menu
has no border at all; it separates from the input purely by being one tone
lighter.

### Named Rules

**The Left Rule.** A closed border is never the answer. A component that needs
definition gets one or two edges — left for state and focus, left-and-right for
transient messages — or it gets a tone step. Four-sided boxes are banned; they
turn a calm console into a form.

## Components

### Input Bar

Restrained and precise, and the only element in the resting interface that
carries the accent. A Raised field with **1 cell** vertical and **2 cells**
horizontal padding, fronted by a single accent rule on its left edge. The
textarea holds focus while either the base or the command layer is on top — the
command menu filters as you keep typing, so it must not steal focus — and shows
the placeholder
`Ask anything... 'Fix a bug in database'`. `Enter` submits, `Shift+Enter` inserts
a newline — the keybinding is part of the design, not a detail. A **1-cell** gap
separates the input from the status bar sharing its panel.

### Command Menu

A floating list on Overlay, borderless, anchored to the top of the input and
capped at 8 rows. Each row is one cell tall: the command name in Foreground
inside a fixed 11-cell column, then its description in Muted and DIM, truncated.
The selected row inverts entirely — Selection fill with Inverse text, and the
description drops DIM so the whole row reads as one block — so selection is
unmistakable at a glance down the column. Rows respond to `onMouseMove` for
selection and `onMouseDown` for execution, but arrow keys and `Escape` are the
primary path and the mouse is an accommodation. The empty state is a single DIM
line, `No commands found`, on the same overlay.

### Status Bar

The system's smallest and most-read element: one row, three parts, a **1-cell**
gap between each. The active agent in the accent, a DIM `›` separator, then the
model name in Foreground. It states two facts and adds nothing. Its restraint is
what lets it sit permanently inside the input panel without competing with the
text being typed.

### Toast

Transient and bracketed. A Raised field with left and right borders in the
variant color — Confirm, Alert, or Info — carrying Foreground body text that
word-wraps. Pinned top-right at 2 cells inset, clamped to 60 cells or the
terminal width minus 6, whichever is smaller. One toast exists at a time; a new
one replaces the current and resets the 3000ms timer. It does not animate,
because it cannot; it appears and it is gone.

### Dialog

The system's one modal surface. An Overlay field centered on both axes, clamped
to `min(64, width - 6)`, carrying a single accent rule on its left edge and a DIM
title row above a **1-cell** gap. It takes the top keyboard layer while open, so
the input behind it stops accepting text — a modal that leaks keystrokes to the
surface behind it is a defect, not a quirk of the medium.

### Dialog Search List

The reusable body of every dialog: a filter input above a list capped at 6 rows.
Typing filters, arrows move the highlight and scroll it into view, `Enter`
confirms, `Escape` dismisses. Rows follow the command menu exactly — one cell
tall, Selection fill with Inverse text when highlighted, `onMouseMove` to
highlight and `onMouseDown` to execute.

It is generic over its item type and takes its row rendering from the caller, so
every future picker — agents, models, sessions — is a filter function and a row,
not a new component. One filterable list, reused, is itself a design decision:
the visitor learns the interaction once.

### Header Wordmark

The single decorative element. Two `ascii-font` `tiny` words separated by a
**0.5-cell** gap, `Nova` in Muted and `Code` in Foreground. The tonal split is
the brand gesture — one word recedes so the other lands. Notably `Code` does
*not* take the accent, because the left rule and the status bar have already
spent the two slots The One Cyan Rule allows.

## Do's and Don'ts

### Do:

- **Do** construct every color with `RGBA.fromIndex` or a terminal default, and
  verify with the `grep` in The Terminal's Theme Wins Rule before treating a
  change as done.
- **Do** check new work on at least two terminal profiles, including a light one.
  The palette is not yours, so a single profile proves nothing.
- **Do** define components with partial borders or a one-step tone change per The
  Left Rule.
- **Do** hold spacing to the three-step cell scale: `0.5`, `1`, `2`.
- **Do** carry hierarchy with color and the DIM attribute, and keep every glyph
  outside the wordmark at one cell.
- **Do** pair every color-carried state with a second signal — an inverted fill,
  a position change, an appearing overlay — per The Never-Only-Color Rule.
- **Do** clamp any absolutely positioned element against the live terminal width
  (`Math.min(60, width - 6)` is the established pattern) and give every fixed
  column a flexible, truncating sibling.
- **Do** design keyboard-first. Arrow keys, `Enter`, and `Escape` are the primary
  path; mouse handlers are added after, never designed around.
- **Do** reach for Dialog Search List before writing a new picker, and push any
  missing capability into it rather than around it.
- **Do** push a new keyboard layer for anything that takes focus, so `Ctrl+C`
  unwinds one level at a time instead of quitting from inside a modal.

### Don't:

- **Don't** write a hex value or a named color string. Both bypass the user's
  palette; the friendly name is the more dangerous of the two because it looks
  like a role.
- **Don't** draw a four-sided border on anything. One or two edges, or none.
- **Don't** introduce a fourth surface tone. Three is the entire depth
  vocabulary.
- **Don't** reach for a shadow, gradient, glow, or radius. They do not exist in
  this medium and every attempt to fake one costs rows.
- **Don't** spend the accent on a third resting element. Two per screen is the
  ceiling.
- **Don't** let the three state colors appear in resting chrome; they belong to
  transient feedback only.
- **Don't** add a preset that differs only in intended color rather than in slot.
- **Don't** let a preview write to disk, or a dismissal leave a preview applied.
- **Don't** put the ASCII wordmark anywhere but the shell's top row.
- **Don't** assume the terminal is wide. Fixed widths without a clamp are a
  defect, not a style choice.
