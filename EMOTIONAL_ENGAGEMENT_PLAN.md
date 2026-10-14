# Emotional Engagement Plan

- Date: 2026-10-13
- Scope: strengthen the emotional pull of the first run and turn a failed run into a clear reason to retry.
- Design target: playful dark fantasy with a brave hero and a mischievous demon; keep the existing readable, warm dungeon palette.
- Platform boundary: preserve the current menu and one-click start, but keep the selected beginner-floor start action visible without scrolling on desktop or mobile. Preserve keyboard/touch controls, current character sheets, and package budget. Do not add a blocking intro, external requests, or large new art/audio assets.

## Player Emotion Arc

1. **Curiosity:** make the role reversal understandable in one glance: the hero enters, and the player protects the dungeon as its demon.
2. **Agency:** make the first trap instruction feel like the player's first clever move, not a menu of rules.
3. **Rivalry:** keep the hero's dodge, hit, and escape feedback readable so the hero feels like an opponent with intent.
4. **Earned retry:** after a loss, name what happened and suggest one useful next move; after a win, credit the player's traps and defense.

## Design Brief

- Keep the existing orange/lava and rose/demon colors; retain cyan/green for safe zones and jump/crouch cues.
- Preserve the current display typography, deep layered panels, and game-screen spacing.
- Keep all new copy to one or two short lines in the existing menu, HUD hint, and result card.
- Reuse existing character animation frames, hit effects, banners, and result transitions. No new atlas is needed for this phase.
- Respect reduced friction: the beginner floor remains preselected and one Deploy action stays visible without scrolling on every viewport; no non-skippable cinematic or extra confirmation screen.

## Implementation Steps

1. **Menu hook:** tighten the title copy around the hero-versus-demon role reversal and dungeon stakes.
2. **Always-visible start action:** show one fixed Deploy action outside the blurred floor panel, center it on wide screens, respect mobile safe areas, and reserve scroll padding under the overlay.
3. **First trap moment:** make the existing first-run prompt and placement celebration sound encouraging and explain the immediate goal.
4. **Result debrief:** use the run outcome and existing trap/hero damage statistics to give a brief, specific encouragement for a retry or a victory acknowledgment.
5. **Verify:** run typecheck/build and artifact checks, inspect actual desktop/mobile UI, measure start-button visibility at 390×844, 844×390, and 1280×720, and review outcome-aware result text.

## Success Criteria

- A new player can tell who they are and what to do from the opening screen and first in-game prompt.
- The selected beginner-run button is visible without scrolling at 390×844, 844×390, and 1280×720.
- A first trap placement gets a short positive response without interrupting play.
- A failed run offers a practical next attempt, and a win recognizes the player's defense.
- No new blocking screen, game mechanic, external dependency, or meaningful package growth is introduced.
- Portal conversion and retention claims remain unconfirmed until real player tests are available.

## Status

- Measurement follow-up (2026-10-13): added Poki first-party events for the tutorial funnel, campaign floor outcomes, and result-screen choices so future playtests can identify where new players stop or continue. CrazyGames player metrics remain a portal dashboard/QA task; actual player data is still pending.

- Implemented: role-stakes menu copy, first-trap encouragement, outcome-aware result narration, and a more characterful hero-dodge cue.
- Verified: `rtk npm run typecheck`, production build, portal submission artifact verifier, and `rtk git diff --check` passed. The verifier checks the current first-trap prompt and success feedback.
- Browser measurements: the single Deploy action is visible at 390×844 (top 768px), 844×390 (top 302px), and 1280×720 (top 632px), with no horizontal page overflow. The loss debrief was rendered and checked.
- Limits: the saved browser profile had already completed its first-trap tutorial, so the first-run HUD prompt was source/build verified but not re-triggered in the browser. The win debrief branch was source/build checked, not captured in a completed victory run. Poki/CrazyGames player conversion and retention remain unmeasured until real player data exists.
