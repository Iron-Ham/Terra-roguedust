# Super Roguedust Notes

## Current status

- Repository initialized; research/design milestone committed (`c7eedc9`).
- Vite/Canvas foundation, persistent save model, menu shell, keyboard/mouse/Gamepad controls, synthesized audio, and vector renderer are implemented.
- Gameplay engine is implemented; next is controlled end-to-end content verification, bug fixes, tutorial polish, and production QA.

## Decisions

- Use vanilla JavaScript and Canvas 2D. This removes runtime dependencies, keeps all art procedural, and gives direct control over high-load rendering.
- Render spherical traversal with lat/lon positions projected around a camera-centred globe. Near side is interactive; back side is visually retained as atmospheric depth.
- Use one persistent currency (`Stardust`) and sparse Flux boons. The Foundry, ships, and content gates are the dominant power curve.
- Ship/menu overlays live in accessible DOM; simulation and effects live in Canvas.
- Save after every purchase and completed run; state has a version field and defensive defaults.
- Design direction: solar-punk rave / arcade planetarium. Warm void, coral/mint/gold energy, dense but legible effects.

## Verification record

- `npm run build` succeeds after the foundation build.
- Development-browser smoke: title screen, launch selection, initial wave, mouse fire, WASD movement, enemy kill, damage feedback, and HUD ran with zero captured runtime errors.

## Next steps

1. Verify every run transition, boon, boss, sector hazard, and ship through browser-driven play.
2. Add first-run context prompts and resolve discovered interaction defects.
3. Run the final fresh-save persistence test and production-preview adversarial pass.
