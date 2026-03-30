# Third-party SDK containers create isolated stacking contexts

## One-line Conclusion
> Never place custom floating UI inside a third-party SDK's DOM container — always portal it out to `document.body`.

## Guidance
- Map SDKs (AMap, Google Maps, Mapbox), video players, and rich editors all create their own stacking contexts via `position`, `overflow`, `transform`, or explicit `z-index` on their root container.
- Any `position: fixed/absolute` child inside that container is trapped in the SDK's stacking context, regardless of `z-index` value.
- The correct escape hatch is React `createPortal(element, document.body)` (or Vue `<Teleport>`, etc.).
- Group all portaled overlays into a single portal entry point for maintainability.
- Use inline `style` (not utility classes) for portal z-index during debugging — it makes the actual computed value immediately visible.

## Boundaries
- Does not apply when the UI is meant to be part of the SDK layer (e.g., AMap custom overlays / markers that should move with the map).
- Does not apply when the SDK provides its own overlay API (e.g., AMap `InfoWindow`).

## Context Links
- Based on: [[knowledge/z-index-layering]]
- Related: [[maxim/preserve-user-visible-behavior-as-a-hard-rule]]
