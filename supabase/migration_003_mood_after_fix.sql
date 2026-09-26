-- BreathFlow: fix mood_after check constraint
-- src/types.ts Mood type has 6 values (calm, energized, focused, sleepy,
-- anxious, happy) but the DB constraint only allowed 4, so every session
-- synced with mood "anxious" or "happy" was rejected with a 400.

ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS user_sessions_mood_after_check;
ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_mood_after_check
  CHECK (mood_after IN ('calm', 'energized', 'focused', 'sleepy', 'anxious', 'happy'));
