-- Learnbay Career Navigator schema. Safe to run repeatedly (npm run db:migrate).

CREATE TABLE IF NOT EXISTS users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL UNIQUE CHECK (email = lower(email)),
  name            text,
  phone_country   text,
  phone           text,
  consent         boolean NOT NULL DEFAULT false,
  consent_at      timestamptz,
  source          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  last_login_at   timestamptz
);

CREATE TABLE IF NOT EXISTS sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  ip          text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS otp_codes (
  id           bigserial PRIMARY KEY,
  email        text NOT NULL,
  code_hash    text NOT NULL,
  attempts     integer NOT NULL DEFAULT 0,
  ip           text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  consumed_at  timestamptz
);
CREATE INDEX IF NOT EXISTS otp_email_idx ON otp_codes(email, created_at DESC);
CREATE INDEX IF NOT EXISTS otp_ip_idx ON otp_codes(ip, created_at DESC);

CREATE TABLE IF NOT EXISTS rate_limits (
  key           text PRIMARY KEY,
  window_start  timestamptz NOT NULL DEFAULT now(),
  count         integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assessments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  answers     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status                 text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  data                   jsonb,
  error                  text,
  attempts               integer NOT NULL DEFAULT 0,
  generating_started_at  timestamptz,
  share_token            text UNIQUE,
  ready_email_sent_at    timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resume_analyses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  file_name   text,
  data        jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id               bigserial PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id  uuid NOT NULL,
  role             text NOT NULL CHECK (role IN ('user', 'model')),
  content          text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_user_idx ON chat_messages(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS counsellor_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_date  date,
  preferred_slot  text NOT NULL,
  note            text,
  status          text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS counsellor_user_idx ON counsellor_requests(user_id, created_at DESC);

-- Partial leads: people who saved progress from the "Don't lose your progress" prompt.
CREATE TABLE IF NOT EXISTS progress_saves (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  answers     jsonb NOT NULL,
  step        integer NOT NULL DEFAULT 0,
  token_hash  text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS progress_email_idx ON progress_saves(email, created_at DESC);

-- ---------- v2: Career Studio (per-tool results, sessions, engagement) ----------

CREATE TABLE IF NOT EXISTS tool_results (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool                   text NOT NULL CHECK (tool IN ('skill-gap', 'salary', 'roadmap')),
  status                 text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  data                   jsonb,
  error                  text,
  attempts               integer NOT NULL DEFAULT 0,
  generating_started_at  timestamptz,
  share_token            text UNIQUE,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tool)
);

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS context text NOT NULL DEFAULT 'advisor';
ALTER TABLE counsellor_requests ADD COLUMN IF NOT EXISTS session_type text NOT NULL DEFAULT 'counselling';
ALTER TABLE counsellor_requests ADD COLUMN IF NOT EXISTS preferred_time text;

CREATE TABLE IF NOT EXISTS lead_events (
  id          bigserial PRIMARY KEY,
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  type        text NOT NULL,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_events_user_idx ON lead_events(user_id, created_at DESC);

-- v3: performance indexes for per-context chat history and lead-event aggregation
CREATE INDEX IF NOT EXISTS chat_user_context_idx ON chat_messages(user_id, context, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_conversation_idx ON chat_messages(conversation_id, created_at);

-- ---------- v4: analytics, AI token metering, admin accounts ----------

CREATE TABLE IF NOT EXISTS analytics_events (
  id          bigserial PRIMARY KEY,
  visitor_id  text,
  session_id  text,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  type        text NOT NULL,
  name        text,
  path        text,
  props       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ae_created_idx ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS ae_type_idx ON analytics_events(type, created_at);
CREATE INDEX IF NOT EXISTS ae_visitor_idx ON analytics_events(visitor_id, created_at);
CREATE INDEX IF NOT EXISTS ae_session_idx ON analytics_events(session_id, created_at);
CREATE INDEX IF NOT EXISTS ae_user_idx ON analytics_events(user_id, created_at);

CREATE TABLE IF NOT EXISTS ai_usage (
  id              bigserial PRIMARY KEY,
  user_id         uuid REFERENCES users(id) ON DELETE SET NULL,
  feature         text NOT NULL,
  model           text NOT NULL,
  prompt_tokens   integer NOT NULL DEFAULT 0,
  output_tokens   integer NOT NULL DEFAULT 0,
  thought_tokens  integer NOT NULL DEFAULT 0,
  total_tokens    integer NOT NULL DEFAULT 0,
  latency_ms      integer,
  status          text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_created_idx ON ai_usage(created_at);
CREATE INDEX IF NOT EXISTS ai_usage_user_idx ON ai_usage(user_id, created_at);
CREATE INDEX IF NOT EXISTS ai_usage_feature_idx ON ai_usage(feature, created_at);

CREATE TABLE IF NOT EXISTS admin_users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash    text,
  failed_attempts  integer NOT NULL DEFAULT 0,
  locked_until     timestamptz,
  last_login_at    timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash  text PRIMARY KEY,
  admin_id    uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_codes (
  id          bigserial PRIMARY KEY,
  admin_id    uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  code_hash   text NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
-- The first admin is created WITHOUT a password; the owner sets it with an emailed code at /admin/login.
INSERT INTO admin_users (email) VALUES ('admissions@learnbay.co') ON CONFLICT (email) DO NOTHING;

-- ---------- v5: email verification at sign-up, eligibility test, email automation ----------

-- Accounts created before sign-up verification existed were all opened by their owner, so they count as verified.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified_at') THEN
    ALTER TABLE users ADD COLUMN email_verified_at timestamptz;
    UPDATE users SET email_verified_at = coalesce(last_login_at, created_at);
  END IF;
END $$;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_opt_out_at timestamptz;

CREATE TABLE IF NOT EXISTS app_meta (
  key    text PRIMARY KEY,
  value  text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eligibility_tests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  track                text NOT NULL,
  question_ids         text[] NOT NULL,
  answers              jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_index        integer NOT NULL DEFAULT 0,
  question_started_at  timestamptz NOT NULL DEFAULT now(),
  started_at           timestamptz NOT NULL DEFAULT now(),
  deadline_at          timestamptz NOT NULL,
  completed_at         timestamptz,
  status               text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  correct              integer,
  total                integer,
  score                integer,
  band                 text,
  breakdown            jsonb
);
CREATE INDEX IF NOT EXISTS eligibility_completed_idx ON eligibility_tests(completed_at);

CREATE TABLE IF NOT EXISTS email_flows (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  trigger       text NOT NULL,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  reentry_days  integer NOT NULL DEFAULT 0,
  exit_on       text[] NOT NULL DEFAULT '{}',
  seed_key      text UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_steps (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id        uuid NOT NULL REFERENCES email_flows(id) ON DELETE CASCADE,
  position       integer NOT NULL,
  delay_minutes  integer NOT NULL DEFAULT 0,
  conditions     text[] NOT NULL DEFAULT '{}',
  subject        text NOT NULL,
  preheader      text,
  heading        text NOT NULL,
  body           text NOT NULL,
  cta_label      text,
  cta_path       text,
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_steps_flow_idx ON email_steps(flow_id, position);

CREATE TABLE IF NOT EXISTS email_enrollments (
  id             bigserial PRIMARY KEY,
  flow_id        uuid NOT NULL REFERENCES email_flows(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'exited')),
  last_position  integer NOT NULL DEFAULT 0,
  next_run_at    timestamptz NOT NULL DEFAULT now(),
  locked_until   timestamptz,
  enrolled_at    timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz,
  exit_reason    text
);
CREATE UNIQUE INDEX IF NOT EXISTS email_enroll_active_uq ON email_enrollments(flow_id, user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS email_enroll_due_idx ON email_enrollments(next_run_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS email_enroll_user_idx ON email_enrollments(user_id, flow_id, enrolled_at DESC);

CREATE TABLE IF NOT EXISTS email_sends (
  id          bigserial PRIMARY KEY,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  flow_id     uuid REFERENCES email_flows(id) ON DELETE SET NULL,
  step_id     uuid REFERENCES email_steps(id) ON DELETE SET NULL,
  to_email    text,
  subject     text,
  status      text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped', 'test')),
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_sends_created_idx ON email_sends(created_at DESC);
CREATE INDEX IF NOT EXISTS email_sends_user_idx ON email_sends(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS email_sends_flow_idx ON email_sends(flow_id, created_at DESC);

-- v6: up to 3 eligibility attempts, with AI-generated questions stored per attempt (answers stay server-side)
ALTER TABLE eligibility_tests ADD COLUMN IF NOT EXISTS attempt integer NOT NULL DEFAULT 1;
ALTER TABLE eligibility_tests ADD COLUMN IF NOT EXISTS questions jsonb;
ALTER TABLE eligibility_tests ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE eligibility_tests DROP CONSTRAINT IF EXISTS eligibility_tests_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS eligibility_user_attempt_uq ON eligibility_tests(user_id, attempt);
CREATE UNIQUE INDEX IF NOT EXISTS eligibility_one_open_uq ON eligibility_tests(user_id) WHERE status = 'in_progress';

-- v7: eligibility questions prepared in the background so starting a test is instant
CREATE TABLE IF NOT EXISTS eligibility_prepared (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt     integer NOT NULL,
  questions   jsonb NOT NULL,
  source      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, attempt)
);

-- v8: admin-managed eligibility question sets, and version history (backups) for admin-edited content
CREATE TABLE IF NOT EXISTS question_sets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  description         text,
  program_area        text NOT NULL DEFAULT 'any',
  source              text NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'bank')),
  questions_per_test  integer NOT NULL DEFAULT 10 CHECK (questions_per_test BETWEEN 3 AND 50),
  seconds_per_question integer NOT NULL DEFAULT 20 CHECK (seconds_per_question BETWEEN 5 AND 300),
  total_seconds       integer NOT NULL DEFAULT 240 CHECK (total_seconds BETWEEN 30 AND 7200),
  max_attempts        integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  version             integer NOT NULL DEFAULT 1,
  seed_key            text UNIQUE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS set_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id      uuid NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
  position    integer NOT NULL,
  topic       text NOT NULL DEFAULT 'Concept',
  text        text NOT NULL,
  options     text[] NOT NULL,
  correct     integer NOT NULL,
  seconds     integer CHECK (seconds IS NULL OR seconds BETWEEN 5 AND 300),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS set_questions_set_idx ON set_questions(set_id, position);
CREATE TABLE IF NOT EXISTS content_versions (
  id           bigserial PRIMARY KEY,
  entity_type  text NOT NULL,
  entity_id    uuid NOT NULL,
  version      integer NOT NULL,
  snapshot     jsonb NOT NULL,
  note         text,
  created_by   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, version)
);
ALTER TABLE eligibility_tests ADD COLUMN IF NOT EXISTS set_id uuid;
ALTER TABLE eligibility_tests ADD COLUMN IF NOT EXISTS set_version integer;
ALTER TABLE eligibility_prepared ADD COLUMN IF NOT EXISTS set_id uuid;
ALTER TABLE eligibility_prepared ADD COLUMN IF NOT EXISTS set_version integer;
