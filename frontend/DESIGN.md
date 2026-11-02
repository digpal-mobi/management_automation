# Obsidian Pulse — TaskPulse AI Dark Interface

Primary design reference for the TaskPulse AI frontend. Use these **canonical application tokens** as the single source of truth. Do not mix alternate palette interpretations.

## Background and surfaces

| Semantic Token | Value     | Usage                        |
|----------------|-----------|------------------------------|
| canvas         | `#0D1117` | Application background       |
| navigation     | `#111821` | Sidebars, top navigation     |
| surface        | `#151C26` | Main content surfaces        |
| elevated       | `#202A36` | Cards, panels, inputs        |
| hover          | `#273342` | Interactive hover states     |
| border         | `#303D4D` | Standard component borders   |
| divider        | `#26313F` | Subtle separators            |

## Typography colors

| Token           | Value     | Usage                          |
|-----------------|-----------|--------------------------------|
| text-primary    | `#EEF2F7` | Main content and headings      |
| text-secondary  | `#95A3B5` | Descriptions and metadata      |
| text-muted      | `#687789` | Placeholders and inactive icons|

## Interactive colors

| Token         | Value     | Usage                          |
|---------------|-----------|--------------------------------|
| accent        | `#88A9FF` | Primary actions and selection  |
| accent-hover  | `#A2BBFF` | Hover states                   |
| accent-subtle | `#202D48` | Selected backgrounds           |

## Semantic colors

| Token   | Value     | Usage                                      |
|---------|-----------|--------------------------------------------|
| success | `#5DBA9D` | Success, completion                        |
| warning | `#D8B36A` | Warnings, at-risk states                   |
| danger  | `#D98287` | Errors, overdue, destructive actions       |

Use semantic colors sparingly — prefer small indicators, icons, text treatments, and lightly tinted backgrounds. Do not fill large containers with red, green, yellow, or blue.

## Typography

- **Primary:** Geist
- **Monospace:** JetBrains Mono

| Role            | Size | Weight | Line height |
|-----------------|------|--------|-------------|
| Page title      | 24px | 600    | 32px        |
| Section heading | 18px | 600    | 24px        |
| Card title      | 14px | 500    | 20px        |
| Standard body   | 14px | 400    | 22px        |
| Compact body    | 13px | 400    | 18px        |
| Labels          | 12px | 400–500| 16px        |
| Captions        | 11px | 500    | 14px        |
| Inline code     | 12px | —      | JetBrains Mono |

## Radii and controls

| Token                   | Value |
|-------------------------|-------|
| `--radius-button`       | 8px   |
| `--radius-card`         | 10px  |
| `--radius-modal`        | 12px  |
| `--control-height`      | 36px  |
| `--control-height-compact` | 32px |

## Layout shells

### Home / management

Persistent left sidebar (`navigation`), top navigation, main content workspace.

### Kanban / project execution

No application sidebar. Full-width workspace with top header, project/board context, filters, and horizontal board scrolling.

## Task detail modal

Centered overlay (~90–94vw, max ~1250–1300px; ~90–92vh). Surface `#151C26`, right panel `#111821`, radius 12px. Left ~64% structured task content; right ~36% Discussion / Activity / Info tabs.

## Chart series (restrained)

Derived from the design system for multi-series charts:

1. `#88A9FF` (accent)
2. `#5DBA9D` (success)
3. `#D8B36A` (warning)
4. `#A2BBFF` (accent-hover)
5. `#D98287` (danger)
6. `#95A3B5` (text-secondary)
