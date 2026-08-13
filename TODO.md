# Super Roguedust — Build Checklist

## Research and design

- [x] Research roguelite progression, pacing, bosses, and repeat-run hooks.
- [x] Write and commit the design, economy, unlock, and content plan.
- [x] Record architecture decisions and recovery notes.

## Foundation

- [x] Scaffold Vite application and production scripts.
- [x] Build accessible title, hangar, foundry, settings, and result overlays.
- [x] Build localStorage save model and reset path.
- [x] Build keyboard/mouse/Gamepad input.
- [x] Build WebAudio music, effects, and settings.
- [x] Build high-DPI canvas globe renderer, starfield, HUD, and particle pool.

## Gameplay

- [x] Build spherical positions, movement, aim, collision, projectiles, dash, and pickups.
- [x] Implement ship archetypes and their distinct weapon behaviours.
- [x] Implement asteroid and eight enemy behaviour families.
- [x] Implement four sectors, wave templates, hazards, and boss arrival flow.
- [x] Implement four bosses with readable multi-phase attacks.
- [x] Implement sparse flux-boon rewards, pause, death, and clear flows.

## Progression

- [x] Implement all Foundry unlock branches and prerequisite reveals.
- [x] Implement sector licences, ship unlocks, Signal levels, and run modifiers.
- [x] Persist all purchases, run records, settings, selected ship, and unlocked content.
- [x] Build first-play tutorial and contextual instruction prompts.

## Polish and verification

- [x] Add visual effects, screen feedback, audio feedback, and reduced-motion support.
- [x] Exercise a first-run death -> purchase -> reload -> stronger-run path.
- [x] Exercise all unlocks, ships, sectors, bosses, boons, pause, reset, and controller code paths.
- [x] Run production build and Vite preview with console-error checks.
- [x] Review diff/status and commit finished game.
