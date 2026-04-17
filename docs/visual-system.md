# CineMatch visual system

Authoritative tokens and UI primitives live in **`src/app/globals.css`** (`:root`, `.theme-dark`, and `ui-*` / `ui-chip*` classes). Use CSS variables and these classes for new screens so spacing, type, chips, inputs, elevation, **motion** (`--motion-duration-*`, `--motion-ease-*`), and stacking stay consistent.

## Type scale (`--font-scale-*`)

| Token | Typical use |
| --- | --- |
| `--font-scale-meta` | Dense meta (year, small chips) |
| `--font-scale-caption` | Labels, helper text, chip default |
| `--font-scale-body` | Inputs, buttons, body UI |
| `--font-scale-subtitle` | Secondary headings |
| `--font-scale-title` | Section titles |
| `--font-scale-display` | Hero / page titles |

## Vertical rhythm (`--rhythm-*`)

| Token | Typical use |
| --- | --- |
| `--rhythm-tight` | Tight stacks (chip rows) |
| `--rhythm-stack` | Related blocks |
| `--rhythm-section` | Sections inside a page |
| `--rhythm-page` | Page-level padding / major gaps |

Prefer `gap-[var(--rhythm-section)]` (or equivalent margin) instead of one-off pixel gaps.

## Radius by role (`--radius-*`)

| Token | Role |
| --- | --- |
| `--radius-control` | Icon buttons, compact controls |
| `--radius-lg` | Text fields |
| `--radius-xl` / `--radius-card` | Cards, glass panels |
| `--radius-panel` | Dropdown / menu panels |
| `--radius-shell` | Modal and bottom-sheet outer shell |
| `--radius-pill` | Chips, pill CTAs |

## Elevation (`--elev-*`)

| Token | Role |
| --- | --- |
| `--elev-surface` | Subtle page panels |
| `--elev-card` | Primary cards / glass panels (`--shadow-soft` aliases this) |
| `--elev-menu` | Floating menus (`--shadow-menu` aliases this) |
| `--elev-modal` | Dialogs needing strongest separation |

## Motion (`--motion-*`)

- **Durations:** `--motion-duration-instant` … `--motion-duration-fade-up`, plus Discover-specific tokens (`--motion-duration-discover-out`, `--motion-duration-discover-in`, swipe, undo, etc.) — all set on `:root` in `globals.css`.
- **Easings:** `--motion-ease-standard` (same curve as `--ease-soft`), `--motion-ease-emphasized` (Discover swipe feedback), `--motion-ease-shimmer`, `--motion-ease-out`.
- **`prefers-reduced-motion: reduce`:** decorative loops (shimmer, soft pulse, confetti) stop; choreographed moves (Discover card in/out, modals, fade-up) use short **opacity-only** keyframes (`motionOpacityIn` / `motionOpacityOut`) instead of the old global “1ms everything” clamp. Interactive hovers that only moved pixels (`translateY` on `.ui-btn`, lift on `.ui-motion-surface`) are disabled in this mode.

## Chips & badges

- **Base:** `.ui-chip` (layout + pill shape only).
- **Tones:** `.ui-chip--surface`, `.ui-chip--surface-lg`, `.ui-chip--accent`, `.ui-chip--media-meta`, `.ui-chip--score-warm`, `.ui-chip--brand-media` (poster “Movie/Series” capsule).
- **Toggle filters / pill actions:** `.ui-chip-btn` (padding + type; pair with your active/inactive colors).

Muted surface chips read `--color-chip-surface-bg` / `--color-chip-surface-text`, overridden in `.theme-dark`.

## Inputs & icon buttons

- **Text fields:** `.ui-input-shell` — states: default, `:hover`, `:focus-visible`, `:disabled` / `[aria-disabled="true"]`, `[aria-invalid="true"]` (error border + focus ring).
- **Icon controls:** `.ui-icon-button` — hover + focus-visible + disabled same idea.

## Z-index (`--z-*`)

Use **`z-[var(--z-…)]`** in components so layers stay documented and grep-friendly.

| Variable | Value | Use |
| --- | ---: | --- |
| `--z-base` | 0 | In-flow content |
| `--z-local` | 10 | Overlays inside a card (e.g. feedback) |
| `--z-nav` | 20 | Bottom navigation |
| `--z-sheet` | 40 | Dimmed sheet / filter backdrop |
| `--z-overlay` | 120 | Fullscreen in-app overlays (e.g. search) |
| `--z-toast-anchor` | 125 | Floating undo / anchored toasts |
| `--z-popover` | 140 | Header dropdowns |
| `--z-banner` | 145 | Short transient banners |
| `--z-modal-backdrop` | 450 | Modal dim layer |
| `--z-modal` | 500 | Modal content + trailer overlay |

**Rule:** stay within this table; if you need a new layer, add a variable here and in `globals.css`, then use it from TSX.
