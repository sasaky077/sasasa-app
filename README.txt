ZERAPHIA build2106 - Tower result confirmation / retry

Updated files:
 index.html
 js/resonance_tower.js
 js/shooting_core.js
 js/shooting_event.js
 version.json

Supabase migration tower_result_confirmation_2106 was applied to the live project.
No further SQL execution is needed for the connected Supabase project.

Behavior:
 - Tower normal/despair RESULT does not exit until finish is confirmed.
 - First attempt + two automatic retries, checking server by the exact run token.
 - On continued failure, retains RESULT and saves the token/outcome in localStorage.
 - Press RESULT back again after connectivity is restored to retry.
 - On next opening the Tower, recovery checks the pending token before starting another run.
 - Replay floor behavior is unchanged (no weekly rewards).

Verification: JavaScript syntax checks passed. Real-device/end-to-end game tests not performed.
