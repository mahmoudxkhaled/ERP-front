# skeleton-page

Refactor ONLY the HTML template to introduce PrimeNG Skeleton loading.

STRICT RULES:

1. DO NOT modify ANY Typescript logic.

    - Do not edit variables.
    - Do not change loading flags.
    - Do not add new observables or state.
    - Only modify HTML template.

2. Replace ALL visual loading indicators (spinners, loading sections, empty placeholders)
   with PrimeNG <p-skeleton>.

3. Use existing loading flags only (example: loading, loadingDetails, isLoading$, etc).

4. VERY IMPORTANT — Preserve layout structure:

    - DO NOT change containers (div, grid, flex layouts).
    - DO NOT remove spacing classes.
    - DO NOT remove alignment or padding wrappers.
    - Skeleton must replace ONLY inner content.
    - Outer layout elements must remain untouched.

5. Skeleton sizing rules (CRITICAL):

    - Skeleton must visually match original component size.
    - Maintain same height, width, margin, spacing.
    - Avoid layout shift (CLS).

    Examples:

    Text → skeleton height ~ line height
    Title → larger skeleton
    Button → skeleton with same height and width
    Image/logo → skeleton with same aspect ratio container

6. Pattern to follow:

Instead of:

<div>
   REAL CONTENT
</div>

Use:

<div>
   <ng-container *ngIf="loading; else realContent">
       <p-skeleton height="X" width="Y"></p-skeleton>
   </ng-container>

<ng-template #realContent>
ORIGINAL CONTENT WITHOUT MODIFICATION
</ng-template>

</div>

7. For complex blocks:

    - Keep original wrapper elements.
    - Replace inner text, icons, tags, images, buttons with skeleton equivalents.

Example:

<h1 class="text-3xl font-bold">
   skeleton height ~2rem width ~60%
</h1>

8. Images or avatars:

DO NOT remove image container.

Replace only img tag content:

<div class="identity-logo">
   skeleton with same width/height
</div>

9. Forms:

    - Label text → small skeleton line
    - Input fields → rectangular skeleton matching input height
    - Buttons → skeleton matching button dimensions

10. Tabs / panels:

-   Keep tab structure intact.
-   Skeletonize panel content only.

11. Avoid repeating async pipe multiple times.
    Use existing loading boolean condition.

GOAL:

Create a professional skeleton loading state that visually matches the final layout exactly, preserving spacing, sizing, alignment, and UI composition.
