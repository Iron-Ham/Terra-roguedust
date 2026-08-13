# Super Roguedust — Build Checklist

## Research and design

- [x] Research roguelite progression, pacing, bosses, and repeat-run hooks.
- [x] Write and commit the design, economy, unlock, and content plan.
- [x] Record architecture decisions and recovery notes.

## Foundation

- [ ] Scaffold Vite application and production scripts.
- [ ] Build accessible title, hangar, foundry, settings, and result overlays.
- [ ] Build localStorage save model and reset path.
- [ ] Build keyboard/mouse/Gamepad input.
- [ ] Build WebAudio music, effects, and settings.
- [ ] Build high-DPI canvas globe renderer, starfield, HUD, and particle pool.

## Gameplay

- [ ] Build spherical positions, movement, aim, collision, projectiles, dash, and pickups.
- [ ] Implement ship archetypes and their distinct weapon behaviours.
- [ ] Implement asteroid and eight enemy behaviour families.
- [ ] Implement four sectors, wave templates, hazards, and boss arrival flow.
- [ ] Implement four bosses with readable multi-phase attacks.
- [ ] Implement sparse flux-boon rewards, pause, death, and clear flows.

## Progression

- [ ] Implement all Foundry unlock branches and prerequisite reveals.
- [ ] Implement sector licences, ship unlocks, Signal levels, and run modifiers.
- [ ] Persist all purchases, run records, settings, selected ship, and unlocked content.
- [ ] Build first-play tutorial and contextual instruction prompts.

## Polish and verification

- [ ] Add visual effects, screen feedback, audio feedback, and reduced-motion support.
- [ ] Exercise a first-run death -> purchase -> reload -> stronger-run path.
- [ ] Exercise all unlocks, ships, sectors, bosses, boons, pause, reset, and controller code paths.
- [ ] Run production build and Vite preview with console-error checks.
- [ ] Review diff/status and commit finished game.
