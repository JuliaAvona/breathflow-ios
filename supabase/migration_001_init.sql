-- BreathFlow: Initial schema migration
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════════════
-- 1. USER SESSIONS — completed breathing sessions
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_sessions (
  id            UUID NOT NULL,
  user_id       UUID NOT NULL DEFAULT auth.uid(),
  date          DATE NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed     BOOLEAN NOT NULL DEFAULT false,

  technique_id  TEXT NOT NULL,

  -- Standard technique data
  cycles_completed  INTEGER NOT NULL DEFAULT 0,
  total_duration    INTEGER NOT NULL DEFAULT 0,   -- seconds

  -- Power Breathing specific
  rounds_completed  INTEGER,
  retention_times   JSONB,        -- [83, 105, 130]
  best_retention    REAL,
  avg_retention     REAL,
  breaths_per_round INTEGER,

  -- Mood tracking
  mood_after        TEXT CHECK (mood_after IN ('calm', 'energized', 'focused', 'sleepy')),

  -- Sync metadata
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, id)
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON user_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Index for date-based queries (history screen)
CREATE INDEX idx_sessions_user_date ON user_sessions (user_id, date DESC);


-- ═══════════════════════════════════════════════════════════════════
-- 2. USER STATS — aggregated statistics
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_stats (
  user_id               UUID PRIMARY KEY DEFAULT auth.uid(),
  total_sessions        INTEGER NOT NULL DEFAULT 0,
  total_minutes         INTEGER NOT NULL DEFAULT 0,
  total_breaths         INTEGER NOT NULL DEFAULT 0,
  current_streak        INTEGER NOT NULL DEFAULT 0,
  longest_streak        INTEGER NOT NULL DEFAULT 0,
  best_retention        REAL NOT NULL DEFAULT 0,
  avg_retention         REAL NOT NULL DEFAULT 0,
  last_session_date     DATE,
  favorite_technique_id TEXT,
  sessions_per_technique JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own stats"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════
-- 3. USER SETTINGS — preferences & technique overrides
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_settings (
  user_id              UUID PRIMARY KEY DEFAULT auth.uid(),

  technique_overrides  JSONB NOT NULL DEFAULT '{}'::JSONB,

  -- Feedback
  sound_enabled        BOOLEAN NOT NULL DEFAULT true,
  sound_style          TEXT NOT NULL DEFAULT 'tone' CHECK (sound_style IN ('tone', 'bell', 'nature', 'bowl')),
  haptics_enabled      BOOLEAN NOT NULL DEFAULT true,
  voice_guidance       TEXT NOT NULL DEFAULT 'off' CHECK (voice_guidance IN ('off', 'phases', 'countdown')),

  -- Appearance
  dark_mode            TEXT NOT NULL DEFAULT 'system' CHECK (dark_mode IN ('system', 'light', 'dark')),

  -- Apple Health
  health_sync_enabled  BOOLEAN NOT NULL DEFAULT false,

  -- Reminder
  reminder_enabled     BOOLEAN NOT NULL DEFAULT false,
  reminder_time        TEXT NOT NULL DEFAULT '08:00',
  reminder_days        JSONB NOT NULL DEFAULT '[0,1,2,3,4,5,6]'::JSONB,

  -- General
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  safety_accepted      BOOLEAN NOT NULL DEFAULT false,
  selected_goal        TEXT CHECK (selected_goal IN ('calm', 'sleep', 'focus', 'energy')),

  is_pro               BOOLEAN NOT NULL DEFAULT false,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════
-- 4. USER BADGES — achievement unlock tracking
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_badges (
  user_id       UUID NOT NULL DEFAULT auth.uid(),
  badge_id      TEXT NOT NULL,
  unlocked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own badges"
  ON user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════
-- 5. UPDATED_AT trigger — auto-update timestamp on changes
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ═══════════════════════════════════════════════════════════════════
-- 6. Enable anonymous sign-in (required for our auth flow)
-- ═══════════════════════════════════════════════════════════════════
-- NOTE: Also enable "Allow anonymous sign-ins" in Supabase Dashboard:
-- Authentication → Providers → Anonymous Sign-Ins → Enable
