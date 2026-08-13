# Super Roguedust Notes

## Current status

- Repository initialized.
- Research complete and design committed in `DESIGN.md`.
- Next: initialize the Vite/Canvas foundation.

## Decisions

- Use vanilla JavaScript and Canvas 2D. This removes runtime dependencies, keeps all art procedural, and gives direct control over high-load rendering.
- Render spherical traversal with lat/lon positions projected around a camera-centred globe. Near side is interactive; back side is visually retained as atmospheric depth.
- Use one persistent currency (`Stardust`) and sparse Flux boons. The Foundry, ships, and content gates are the dominant power curve.
- Ship/menu overlays live in accessible DOM; simulation and effects live in Canvas.
- Save after every purchase and completed run; state has a version field and defensive defaults.
- Design direction: solar-punk rave / arcade planetarium. Warm void, coral/mint/gold energy, dense but legible effects.

## Verification record

- Pending implementation.

## Next steps

1. Scaffold Vite project and canvas shell.
2. Build persistence, input, audio, renderer, and simulation systems.
3. Exercise the production build through a browser automation playthrough.
