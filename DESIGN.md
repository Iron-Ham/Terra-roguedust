# Super Roguedust — Design

## Research distilled

Research preceded this design. Three conclusions shape the game:

1. **Death must create a concrete next decision.** Rogue Legacy combines death, inheritable wealth, and a deliberately hidden upgrade tree so a novice sees an approachable next choice rather than a wall of systems ([Cellar Door tutorial deep dive](https://www.gamedeveloper.com/design/game-design-deep-dive-how-i-rogue-legacy-i-handles-tutorials-without-being-boring)). Super Roguedust begins with one visible Foundry branch and reveals specialist paths through purchases and bosses.
2. **Permanent growth should express playstyle, not only inflate values.** Hades' Mirror rework added alternatives for player-fit choices, while its late Pact makes mastery opt-in ([Supergiant update](https://www.supergiantgames.com/blog/hades-the-nighty-night-update-patch-notes/); [Hades FAQ](https://www.supergiantgames.com/blog/hades-faq/)). Super Roguedust spends a single earned resource on mutually themed upgrades, ships, and world access; late Signal levels trade danger for rewards.
3. **The repeatable action must remain satisfying.** Roguelites are repeated dozens of times; systemic imbalance and weak moment-to-moment combat cannot be repaired by procedural variety ([Entalto roguelite design notes](https://entaltostudios.com/5-essential-tips-to-make-your-roguelite-game-work/)). The game therefore uses direct twin-stick aim, immediate hit feedback, readable telegraphs, deterministic encounter tables, and small temporary choices rather than a constant stat drip.

The game also adopts Rogue Legacy's compact-content principle: a few authored enemy families and bosses, recombined through wave composition, are stronger than a broad shallow catalog ([Cellar Door postmortem summary](https://www.gamedeveloper.com/design/video-developing-i-rogue-legacy-i-on-a-budget)).

## Product thesis

**Super Roguedust** is an arcade asteroid shooter where every object is pinned to a glowing planet. The player drives around the surface with a twin-stick ship, turns the right stick or mouse toward a target, and breaks meteor swarms before they surround the world. Runs are short, intense expeditions through four hostile sectors. Death banks **Stardust**, turning failure into permanent shipyard progress.

**Audience:** desktop action players who want the immediate readability of Geometry Wars and the long-term pull of Rogue Legacy. Sessions are 10–18 minutes; an entire progression path spans many evenings.

**Aesthetic:** `solar-punk rave` rather than retro wireframe: a warm ink-black void, electric coral/mint/gold projectiles, ember planets, layered star fields, heavy bloom-like additive particles, and clear geometric silhouettes. No external art or font assets.

## Core controls

| Action | Keyboard/mouse | Controller |
| --- | --- | --- |
| Move on globe | WASD / arrows | Left stick |
| Aim | mouse | Right stick |
| Fire | left mouse / Space | RT / A |
| Dash | Shift / right mouse | LT / B |
| Pause | Escape | Start |

The world is modelled as longitude/latitude on a sphere. The camera is fixed over the current latitude/longitude: all entities travel along the surface, foreground objects scale up, far-side objects fade and cannot hit. This preserves the iconic globe while keeping targeting legible.

## Run structure

1. Choose an unlocked ship in the Hangar, optional late-game Signal level, then **Launch**.
2. Survive a sector's six 35–50 second escalating waves. Asteroids split; enemies introduce their signature attack; salvage drops from kills.
3. At wave 3 and 6 choose one of three temporary **Flux boons**. Boons are sparse, specific, and lost on death.
4. Defeat a sector boss. Bosses have telegraphed phases, a fixed reward, and unlock the next sector on first clear.
5. At any death or cleared finale, bank Stardust and return to the Foundry. Retained earnings always include kill salvage; boss first clears give a large, visible bonus.

A starting run gets enough currency for the first meaningful purchase even after an early death. A typical first boss needs 3–5 runs; the final boss needs a tuned fleet and approximately 15–25 runs. Replaying cleared sectors supports alternate ships and late Signal challenges.

## Persistent meta progression

One currency keeps the loop clear. `Stardust` is collected in-run, retained on death, and saved in `localStorage` immediately when results are awarded.

### Foundry branches

| Branch | Role and unlock cadence | Upgrades |
| --- | --- | --- |
| Core systems | Visible at start; makes the first deaths less punishing | Reinforced Hull I–III (+1 max hull each), Ion Thrusters I–II (+7% move), Dust Magnet I–II, Afterburner (dash unlock), Phase Plating (dash invulnerability) |
| Arsenal | Revealed by first boss clear; changes offensive feel | Plasma Focus I–III (+12% damage), Split Payload (shot fragments), Ricochet Lens (+1 bounce), Nova Capacitor (charged radial burst) |
| Navigation | Revealed by spending 250 Stardust; opens route variety | Sector 2 licence, Sector 3 licence, Sector 4 licence, Cartographer (+boss bonus), Recovery Protocol (+minimum death payout) |
| Fleet | Revealed after Sector 2 clear; meaningful ship archetypes | unlocks Comet, Bastion, Wisp, and Eclipse ships |
| Signal | Revealed after game clear; voluntary risk/reward | Signal I–V: more enemy health/speed and +25% Stardust each level |

Prerequisites are presented as connected stars; unavailable branches are visually present only after their reveal condition. Costs rise from 20 to 900 Stardust. There are 24 purchases, enough for several hours given a 30–140 Stardust run reward.

### Ships

| Ship | Starting identity | Unlock |
| --- | --- | --- |
| **Vanguard** | balanced, 4 hull, 0.30 s fire cadence | start |
| **Comet** | fast, 3 hull, rapid precise fire | 300 Stardust + Fleet reveal |
| **Bastion** | 6 hull, heavy slow triple burst, armoured dash | 550 Stardust + Fleet reveal |
| **Wisp** | 3 hull, orbiting drone, magnet bonus | 850 Stardust + Sector 3 clear |
| **Eclipse** | 4 hull, piercing beam pulse, harvests charged shots | 1200 Stardust + game clear |

Each ship changes geometry and combat cadence, not just numbers. Ship-specific color, trail, gun behavior, and HUD language make the choice immediately legible.

## Temporary Flux boons

At most two per sector. Examples: **Shard Rain** (asteroid kills spray fragments), **Rail Coil** (shots pierce), **Voidwake** (dash harms), **Prism Core** (three-way fire), **Collector** (salvage orbits before absorption), **Fission** (enemies explode), **Emergency Hull** (+1 hull once). Their power remains below the permanent tree and they deliberately create tactical stories without becoming the dominant growth loop.

## World and content progression

| Sector | New rule | Standard enemies | Boss |
| --- | --- | --- | --- |
| 1: Cinder Reach | Asteroids split into fragments | Drifter, Spitter, Mine | **The Cinder Maw** — orbiting crusher with shockwave rings |
| 2: Verdant Drift | Comet lanes sweep around the globe | Charger, Sentry, Leech | **Verdant Bloom** — petal turrets and rotating safe gaps |
| 3: Azure Trench | Gravity wells bend enemy paths | Weaver, Bulwark, Prism | **The Blue Archivist** — beam lattice that asks the player to circle the planet |
| 4: Null Crown | Void seams erase reckless bullets | Reaper, Swarm, Echo | **The Dust Sovereign** — four-phase final encounter mixing every prior language |

Each sector has six authored encounter templates that are shuffled by seeded RNG. Enemy type unlocks are sector-gated; no enemy appears before its behaviour has a safe introduction. Sectors build new spatial questions on the planet rather than merely adding health.

## Boss contract

Bosses appear only after an encounter banner and a two-second arrival telegraph. They maintain a small move set with large, coloured warnings: sweeps, radial rings, mines, charging lines, and summon volleys. Health thresholds transition phases with short invulnerable spectacle, then restart a stricter version of the learnt pattern. Their rewards are first-clear Stardust, a branch reveal or sector licence, and a run result record. Bosses never silently scale with meta power; only the opt-in Signal increases their health and speed.

## Economy and balance targets

- Early loss, 20–45 Stardust: purchase a Core node every 1–2 runs.
- Sector 1 boss first clear, 140–180 Stardust: reveal Arsenal/Navigation, offer a second power path.
- Midgame clear, 170–300 Stardust: a ship every 3–5 successful expeditions.
- Finale clear, 350–450 Stardust: unlock Eclipse and Signal challenge.
- Cap first-run loss at a 20 Stardust Recovery Protocol payout once bought so a bad attempt retains forward motion.

Base player damage is intentionally modest. Fully upgraded Vanguard has ~2.0x effective damage and ~1.75x survivability before player skill, enough to make the meta layer decisive but not erase enemy patterns.

## Accessibility and quality bar

- Adjustable screen shake and audio sliders; reduced-motion disables shake and lowers particle count.
- Every hostile uses silhouette + colour + telegraph shape, not colour alone.
- Keyboard, mouse, and standard Gamepad API controls support the full loop.
- Hit flashes, damage rings, pickup pings, HUD pulse, and WebAudio synthesis give each action feedback.
- Canvas uses bounded pools and particle caps; no runtime network activity or downloaded assets.

## Implementation plan

Vite + vanilla ES modules + a high-DPI Canvas 2D renderer. The game uses hand-written vector math, procedural particles, WebAudio oscillators, `localStorage`, and DOM overlays for menus. This has the lowest deployment surface, no external runtime dependency, and keeps hundreds of moving surface entities inside a predictable 60 FPS render loop.
