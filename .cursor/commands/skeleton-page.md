# skeleton-page

Refactor **ONLY** the HTML template to introduce PrimeNG Skeleton loading.

---

## STRICT RULES

### 1. DO NOT modify ANY TypeScript logic

- Do not edit variables
- Do not change loading flags
- Do not add new observables or state
- **Only** modify the HTML template

---

### 2. Replace ALL visual loading indicators

- Remove spinners / loaders / placeholders
- Use **ONLY** `<p-skeleton>`

---

### 3. Use existing loading flags only

Examples:

- `loading`
- `loadingDetails`
- `isLoading$`

---

### 4. VERY IMPORTANT — Preserve layout structure (STRICT)

- **DO NOT** change containers (`div`, grid, flex, etc.)
- **DO NOT** remove or change:
  - padding
  - margin
  - gap
  - spacing utilities (`mb-*`, `mt-*`, `p-*`, `gap-*`, etc.)
- **DO NOT** change alignment classes:
  - `text-center`, `text-start`, `text-end`
  - `flex`, `justify-*`, `items-*`
- **DO NOT** alter layout hierarchy

- Skeleton must replace **ONLY inner content**
- Outer layout **MUST** remain **identical**

---

### 5. CRITICAL — Size, spacing & alignment fidelity

#### Mandatory

- Skeleton **MUST** match:
  - **Exact width** (where it matters for the block)
  - **Exact height** (line / control / image block)
  - **Same spacing** (margin / padding / gap)
  - **Same alignment** (text / flex positioning)

#### Alignment

Detect and preserve alignment:

- `text-center` → skeleton must appear centered in that block
- `text-end` → skeleton aligned to the end
- `flex justify-between` → skeleton pieces respect the same distribution
- `items-center` → skeleton vertically centered as in the loaded state

**Never** break alignment behavior.

#### Spacing

- Preserve **ALL** `gap-*`, margin, and padding utilities
- Skeleton elements must sit in the **same wrappers** with the **same spacing classes**
- **Do NOT** collapse or compress spacing

#### Size (by element type)

| Element type   | Skeleton rule                          |
| ---------------- | ---------------------------------------- |
| Text             | height ≈ line-height of that text       |
| Title            | larger height (match heading size)      |
| Button           | same height & width as the real button  |
| Input            | same height as the input               |
| Avatar / image   | same width/height (or ratio) as media   |
| Card / block     | same spacing & block footprint          |

---

### 6. Pattern to follow

Instead of:

```html
<div>
  REAL CONTENT
</div>
```

Use:

```html
<div>
  <ng-container *ngIf="loading; else realContent">
    <p-skeleton height="X" width="Y"></p-skeleton>
  </ng-container>

  <ng-template #realContent>
    ORIGINAL CONTENT WITHOUT MODIFICATION
  </ng-template>
</div>
```

(Equivalent: `*ngIf="loading; else realContent"` on a wrapper with `<ng-template #realContent>` — keep the same structure the file already uses.)

---

### 7. Complex blocks

- Keep **ALL** wrappers exactly as-is
- Replace **ONLY** text, icons, images, buttons, and dynamic values with skeletons

**Example**

```html
<h1 class="text-3xl font-bold text-center mb-3">
```

Skeleton **MUST**:

- Keep `text-center`
- Keep `mb-3`
- Use height ~2rem (or match `text-3xl`)
- Stay visually centered

---

### 8. Images / avatars

- **DO NOT** remove the container
- Replace only inner content

```html
<div class="identity-logo">
  <p-skeleton width="100%" height="100%"></p-skeleton>
</div>
```

---

### 9. Forms

- Label → small skeleton line
- Input → full-width rectangular skeleton matching input height
- Button → skeleton matching button size

**Keep spacing between fields EXACTLY** as in the loaded form.

---

### 10. Tabs / panels

- **DO NOT** modify tab structure
- Apply skeleton **ONLY** inside the active content area

---

### 11. Async handling

- **Do NOT** duplicate async pipes
- Use **existing loading flags** only

---

## FINAL GOAL

Create a skeleton state that is:

- Visually consistent with the final UI (size + spacing + alignment)
- Preserves layout, padding, gaps, and alignment
- Causes **zero layout shift (CLS)** when switching loading → loaded

## Golden rule

> When the skeleton disappears, the UI must **not** move — not even by 1px.
