# Super Roguedust Notes

## Current status

- Repository initialized; research/design milestone committed (`c7eedc9`).
- Full game implementation and production verification are complete: four sectors, bosses, enemy families, ships, Foundry nodes, Signal levels, effects, and persistence paths are shipping.
- Production-preview fresh-state test confirmed the core death-to-Foundry loop and a persisted five-hull follow-up run with zero captured runtime errors.
- Surface latitude is opposite screen Y; player movement and player-shot velocity therefore negate screen Y before travelling across the globe. Keyboard and Gamepad up now move/shoot toward the globe's visible north.
- Globe traversal has no polar clamp: player, bullets, pickups, and enemies keep travelling across the sphere rather than sticking to an artificial latitude boundary.
- Player traversal now follows a camera-relative tangent frame that is parallel-transported over the sphere. Movement distance is latitude-invariant, aim remains screen-relative, and the surface grid is projected from that moving frame.
- Player-shot lifetime now decrements after its spherical movement step. Normal, lance, Nova, and hostile shots expire at their authored durations instead of orbiting indefinitely.
- Dash is a base movement tool. Afterburner Tuning now reduces its 1.15-second recharge by 25%; the HUD correctly begins at READY. Resolving a Flux immediately clears its selection overlay before play resumes.

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
- Production preview (`vite preview`) fresh-save pass: no external runtime resources, title-to-run control exercise, pause/resume, immediate hull breach, 20 Stardust recovery, Hull I purchase, reload, and a 5-max-hull follow-up run all passed with no captured runtime errors.
- Control regression: browser input reproduction confirmed W/mouse-up and Gamepad-up now produce positive surface latitude and positive projectile latitude velocity; S/mouse-down produce the inverse. No captured runtime errors.
- Traversal regression: a player starting at latitude 1.56 and holding Up crossed the former polar limit to latitude 2.14; an upward projectile advanced from 1.43 to 1.76. Development combat smoke and the production preview completed with no captured runtime errors.
- Perspective regression: fixed-step diagonal movement traveled 0.3478965 radians at the equator and at latitude 1.5 (difference 3.22e-15). A fixed world marker shifted beneath the centered ship; up/right shots remained respectively above/right of the ship near a pole.
- Projectile regression: before the fix a 1.2-second player shot remained alive after 1.5 seconds. Afterward, normal (1.2 s), lance (1.6 s), Nova (0.7 s), and hostile (4 s) shots all expired after their limits with no captured runtime errors.
- Feedback regression: a fresh run now begins with Dash READY, returns to READY after its 1.15-second recharge, and Afterburner Tuning reduces that cooldown to 0.8625 seconds. Clicking a Flux card now clears the overlay, records the boon, and returns to playing with no captured runtime errors.

## Next steps

1. Shipping milestone committed.
