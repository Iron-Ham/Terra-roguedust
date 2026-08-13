# Super Roguedust Notes

## Current status

- Repository initialized; research/design milestone committed (`c7eedc9`).
- Full game implementation is complete: all four sectors, bosses, enemy families, ships, Foundry nodes, Signal levels, effects, and persistence paths are present.
- Development verification found and fixed two real progression defects: Signal levels now take the highest unlocked tier rather than summing to 15, and Afterburner/Phase Plating are carried into new-run player state.

## Decisions

- Use vanilla JavaScript and Canvas 2D. This removes runtime dependencies, keeps all art procedural, and gives direct control over high-load rendering.
- Render spherical traversal with lat/lon positions projected around a camera-centred globe. Near side is interactive; back side is visually retained as atmospheric depth.
- Use one persistent currency (`Stardust`) and sparse Flux boons. The Foundry, ships, and content gates are the dominant power curve.
- Ship/menu overlays live in accessible DOM; simulation and effects live in Canvas.
- Save after every purchase and completed run; state has a version field and defensive defaults.
- Design direction: solar-punk rave / arcade planetarium. Warm void, coral/mint/gold energy, dense but legible effects.

## Verification record

- `npm run build` succeeds after the foundation build.
- Development-browser smoke: title screen, launch selection, first run death, Foundry purchase, reload persistence, and a 5-hull upgraded follow-up run completed with zero captured runtime errors.
- All four boss routes produced their unique boss states and results. Every roster family, sector hazard, Flux effect, Foundry purchase, ship weapon, Signal level, reduced-motion mode, and emulated Gamepad mapping was exercised.
- Heavy scene measurement: 150 active enemies plus 620 particles sustained 16.67 ms average / 16.8 ms worst animation-frame intervals in headless Chrome.
- Scripted Sector 1 all-kill economy simulation yields 167 Stardust, within the documented 140–180 first-boss target.

## Next steps

1. Rebuild the corrected production bundle.
2. Run the final production-preview fresh-save adversarial session, including console capture and visual checks.
3. Inspect final repository state and commit the shipping milestone.
