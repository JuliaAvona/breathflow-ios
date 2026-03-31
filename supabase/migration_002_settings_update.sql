-- BreathFlow: Settings table update
-- Adds missing columns, removes voiceGuidance, updates sound_style constraint

-- 1. Add new columns
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS text_size TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS daily_goal_minutes INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS recommended_technique_id TEXT;

-- 2. Drop old voice_guidance column (no longer used)
ALTER TABLE user_settings DROP COLUMN IF EXISTS voice_guidance;

-- 3. Update any old sound_style values BEFORE adding new constraint
UPDATE user_settings SET sound_style = 'tone' WHERE sound_style NOT IN ('tone', 'nature', 'voice', 'off');

-- 4. Update sound_style constraint to match new options (tone, nature, voice, off)
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_sound_style_check;
ALTER TABLE user_settings ADD CONSTRAINT user_settings_sound_style_check
  CHECK (sound_style IN ('tone', 'nature', 'voice', 'off'));
