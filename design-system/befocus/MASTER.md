# BeFocus — Quiet Field design system

This document is the project source of truth. The visual system was designed directly from the product brief and first principles; no global UI/design skill or stock interface template is used.

## Product stance

BeFocus is a personal workbench, not a marketing page. The interface should feel like a quiet desk: clear next action, visible progress, and enough breathing room to think. Content and state create hierarchy; decoration is last.

## Visual language

- Warm paper background, ink text, moss focus accent, clay for completed work, amber only for attention.
- One-pixel rules and short section dividers establish structure. Use shadows only for dialogs and the active timer tray.
- Radius scale: 6px controls, 10px surfaces, 16px large trays. Never use a giant radius on every component.
- No gradients, blobs, glassmorphism, fake stats, decorative icon rows, or generic SaaS hero copy.
- Icons are from Lucide, 18px in controls and 16px inline. Every icon-only action has an accessible label.

## Tokens

```css
--paper: #f6f5f0;
--paper-raised: #fffefa;
--ink: #1e2924;
--ink-soft: #59645e;
--line: #d9dfd8;
--line-strong: #b9c5bb;
--moss: #2f6f59;
--moss-dark: #1f503e;
--moss-wash: #e6f0e9;
--clay: #c96843;
--clay-wash: #f8e9e1;
--amber: #a96c13;
--amber-wash: #fff1d2;
--ocean: #4f7188;
--plum: #795b70;
--danger: #b83a3a;
--focus-ring: #1b78a8;
```

Spacing uses 4px units: 4, 8, 12, 16, 24, 32, 48. Body text is 16px with 1.5 line height. Main content max width is 1180px.

Typography uses `DM Sans` for UI and `IBM Plex Mono` for timer/data values. Vietnamese copy should remain natural and concise; avoid marketing filler.

## Layout

Desktop uses a 232px left rail plus a fluid content column. Mobile replaces the rail with a compact top bar and a five-item bottom navigation. The dashboard intentionally has a few large regions rather than a grid of identical cards:

1. Today header + primary focus action.
2. Habit ledger with progress marks.
3. Focus rhythm chart and task list.
4. Recent activity / a data-backed insight.

## Interaction and accessibility

- Keyboard order follows visual order; provide a skip link to `#main-content`.
- Buttons and inputs are at least 44×44px on touch surfaces, with visible focus rings.
- Use controlled form fields, inline errors with `role=alert`, `aria-live` for timer state, and clear loading/empty/error recovery states.
- Motion is limited to 150–250ms state feedback and respects `prefers-reduced-motion`.
- Charts have an adjacent textual summary/table fallback; color is never the only state signal.

## Chart conventions

Use Recharts only when a chart makes a real comparison easier to read. Timing distributions use low-ink bar charts with one moss series and textual labels; summary breakdowns remain accessible lists with progress bars. Habit heatmap cells use light-to-dark moss wash with an accessible label (`date`, `value`, `target`).
