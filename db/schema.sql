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

-- v9: AI counsellors allocated round robin after sign-up, and call requests (from the call button or the chat)
ALTER TABLE users ADD COLUMN IF NOT EXISTS counsellor text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS counsellor_prev text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS counsellor_active boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS call_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  name          text,
  phone_country text,
  phone         text NOT NULL,
  counsellor    text,
  source        text NOT NULL DEFAULT 'button',
  status        text NOT NULL DEFAULT 'new',
  detail        text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS call_requests_created_idx ON call_requests(created_at);

-- v10: saved chat threads (a new chat starts a new thread; old ones stay available after login on any device)
CREATE TABLE IF NOT EXISTS chat_threads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'New chat',
  counsellor  text,
  items       jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_threads_user_idx ON chat_threads(user_id, updated_at DESC);

-- v11: learners rate their conversation with a counsellor (one review per chat; the average shows on the counsellor's profile)
CREATE TABLE IF NOT EXISTS counsellor_reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id   uuid REFERENCES chat_threads(id) ON DELETE SET NULL,
  counsellor  text NOT NULL,
  rating      integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS counsellor_reviews_thread_idx ON counsellor_reviews(user_id, thread_id);
CREATE INDEX IF NOT EXISTS counsellor_reviews_counsellor_idx ON counsellor_reviews(counsellor, created_at);
-- v12: the rating pop-up also asks about the eligibility test and for suggestions
ALTER TABLE counsellor_reviews ADD COLUMN IF NOT EXISTS test_rating integer CHECK (test_rating BETWEEN 1 AND 5);
ALTER TABLE counsellor_reviews ADD COLUMN IF NOT EXISTS suggestion text;

-- v13: topics learners asked about that the published syllabus doesn't list (the counsellor says trainers cover relevant
-- ones; the team confirms: already in the course -> publish it, or add it). Also a learner-approved program choice.
CREATE TABLE IF NOT EXISTS topic_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES users(id) ON DELETE SET NULL,
  program_id      text,
  topic           text NOT NULL,
  verdict         text NOT NULL CHECK (verdict IN ('covered', 'not-needed', 'other-program')),
  learner_message text,
  status          text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in-course', 'to-add', 'not-relevant')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS topic_requests_status_idx ON topic_requests(status, created_at DESC);

-- v14: the project library (from the brochures, plus projects written in the same style), editable in Admin → Projects.
-- Learners see 4 at a time that fit their program and industry; project_views keeps the rotation fresh.
CREATE TABLE IF NOT EXISTS projects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text NOT NULL DEFAULT '',
  tools        text[] NOT NULL DEFAULT '{}',
  kind         text NOT NULL DEFAULT 'module' CHECK (kind IN ('module', 'capstone', 'domain')),
  module       text,
  domain       text,
  programs     text[] NOT NULL DEFAULT '{}',
  source       text NOT NULL DEFAULT 'admin' CHECK (source IN ('brochure', 'generated', 'admin')),
  source_ref   text,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_programs_idx ON projects USING gin (programs);
CREATE UNIQUE INDEX IF NOT EXISTS projects_title_domain_idx ON projects (lower(title), coalesce(domain, ''));
CREATE TABLE IF NOT EXISTS project_views (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  shown_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

-- v15: each section of the studio (skill gap, salary, roadmap, eligibility, mentor call, masterclasses) keeps its own
-- chat, so going back to a section reopens that conversation. NULL = the main counselling chat.
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS topic text;
CREATE INDEX IF NOT EXISTS chat_threads_topic_idx ON chat_threads(user_id, topic, updated_at DESC);

-- v16: counselling calls can be rescheduled (not cancelled); count how often, for the counsellor team.
ALTER TABLE counsellor_requests ADD COLUMN IF NOT EXISTS rescheduled integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS counsellor_slot_idx ON counsellor_requests(preferred_date, preferred_time);

-- v17: companies shown to learners (Admin → Companies). alumni = Learnbay publishes that its alumni work there;
-- the rest are well-known companies hiring for tech, data, AI and cloud roles in India. featured = on the chat card.
CREATE TABLE IF NOT EXISTS hiring_companies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  category    text NOT NULL,
  alumni      boolean NOT NULL DEFAULT false,
  featured    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS hiring_companies_name_idx ON hiring_companies(lower(name));

-- v18: roles and specialisations for projects (Admin → Courses & roles). learner_roles: the learner role ids (and
-- "industry:<id>" for industries) that see these projects; keywords: words in a typed role or industry that match.
CREATE TABLE IF NOT EXISTS project_domains (
  key            text PRIMARY KEY,
  label          text NOT NULL,
  kind           text NOT NULL DEFAULT 'role' CHECK (kind IN ('industry', 'role')),
  learner_roles  text[] NOT NULL DEFAULT '{}',
  keywords       text[] NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);
-- Which roles each course offers projects for; core = every learner of the course sees them (e.g. SDE specialisations).
CREATE TABLE IF NOT EXISTS course_roles (
  program_id  text NOT NULL,
  domain_key  text NOT NULL REFERENCES project_domains(key) ON DELETE CASCADE,
  core        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (program_id, domain_key)
);

-- v19: sales team (staff portal at /admin/crm). Four roles on admin_users: one protected admin (all access), managers,
-- associates (under a manager, or independent) and ISMs (under an associate, mapped directly to a manager, or neither).
-- Existing accounts become managers; ravi@learnbay.co is the admin. New rows default to the least privileged role.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'manager';
ALTER TABLE admin_users ALTER COLUMN role SET DEFAULT 'ism';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS team text;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS associate_id uuid REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS in_rotation boolean NOT NULL DEFAULT true;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS rr_last_assigned_at timestamptz;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS created_by uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_role_check') THEN
    ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('admin', 'manager', 'associate', 'ism'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_parent_check') THEN
    ALTER TABLE admin_users ADD CONSTRAINT admin_users_parent_check CHECK (
      (role IN ('admin', 'manager') AND manager_id IS NULL AND associate_id IS NULL)
      OR (role = 'associate' AND associate_id IS NULL)
      OR (role = 'ism' AND NOT (manager_id IS NOT NULL AND associate_id IS NOT NULL)));
  END IF;
END $$;
-- Exactly one admin, ever.
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_one_admin ON admin_users ((true)) WHERE role = 'admin';
CREATE INDEX IF NOT EXISTS admin_users_manager_idx ON admin_users(manager_id);
CREATE INDEX IF NOT EXISTS admin_users_associate_idx ON admin_users(associate_id);
INSERT INTO admin_users (email, role, name) SELECT 'ravi@learnbay.co', 'manager', 'Ravi Pradhan'
 WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE email = 'ravi@learnbay.co');
UPDATE admin_users SET role = 'admin', manager_id = NULL, associate_id = NULL, active = true
 WHERE email = 'ravi@learnbay.co' AND NOT EXISTS (SELECT 1 FROM admin_users WHERE role = 'admin');
-- The admin account cannot be deleted, deactivated, demoted or renamed to another email, by any code path.
CREATE OR REPLACE FUNCTION protect_admin_user() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'admin' THEN RAISE EXCEPTION 'The admin account is protected and cannot be deleted.'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.role = 'admin' AND (NEW.role <> 'admin' OR NEW.active = false OR NEW.email <> OLD.email) THEN
    RAISE EXCEPTION 'The admin account is protected and cannot be changed this way.';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS admin_users_protect ON admin_users;
CREATE TRIGGER admin_users_protect BEFORE UPDATE OR DELETE ON admin_users FOR EACH ROW EXECUTE FUNCTION protect_admin_user();

-- Who owns each lead (a learner account) and how they got it. Leads with no row are unassigned (the admin queue).
CREATE TABLE IF NOT EXISTS lead_owners (
  user_id      uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  owner_id     uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  source       text NOT NULL CHECK (source IN ('crm', 'round_robin', 'manual', 'self')),
  status       text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'not_interested', 'enrolled', 'lost')),
  created_by   uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  assigned_by  uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_owners_owner_idx ON lead_owners(owner_id, assigned_at DESC);
-- Every change of owner (for tracing who held a lead when).
CREATE TABLE IF NOT EXISTS lead_assignments (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_id     uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  to_id       uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  source      text NOT NULL,
  by_id       uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_assignments_user_idx ON lead_assignments(user_id, created_at DESC);
-- What staff did on a lead account (the learner's own actions stay in lead_events). actor_kind is the actor role
-- at the time, so analytics can split work by ISM, associate, manager and admin.
CREATE TABLE IF NOT EXISTS lead_activities (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_kind  text NOT NULL CHECK (actor_kind IN ('admin', 'manager', 'associate', 'ism', 'system')),
  actor_id    uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_activities_user_idx ON lead_activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_activities_created_idx ON lead_activities(created_at);
CREATE INDEX IF NOT EXISTS lead_activities_actor_idx ON lead_activities(actor_id, created_at);
-- Calls to make and reminders. Booked calls and call requests become tasks automatically (kind + source_id);
-- a task still open after missed_at is a missed call, charged to the owner at that time.
CREATE TABLE IF NOT EXISTS lead_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_id      uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  kind          text NOT NULL CHECK (kind IN ('call_booked', 'call_request', 'follow_up', 'reminder')),
  title         text NOT NULL,
  note          text,
  due_at        timestamptz NOT NULL,
  missed_at     timestamptz,
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'cancelled')),
  outcome       text,
  outcome_note  text,
  source_id     uuid,
  created_by    uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  completed_by  uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS lead_tasks_source_idx ON lead_tasks(kind, source_id);
CREATE INDEX IF NOT EXISTS lead_tasks_owner_idx ON lead_tasks(owner_id, status, due_at);
CREATE INDEX IF NOT EXISTS lead_tasks_user_idx ON lead_tasks(user_id, due_at DESC);
-- Staff notes on a lead.
CREATE TABLE IF NOT EXISTS lead_notes (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id   uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_notes_user_idx ON lead_notes(user_id, created_at DESC);
-- Who changed which staff account, and how (privilege audit trail).
CREATE TABLE IF NOT EXISTS staff_audit (
  id          bigserial PRIMARY KEY,
  actor_id    uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  target_id   uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS staff_audit_created_idx ON staff_audit(created_at DESC);
-- Learners who sign up from now on are allocated automatically; older accounts wait for the admin to distribute them.
CREATE TABLE IF NOT EXISTS crm_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
INSERT INTO crm_settings (key, value) VALUES ('allocation_started_at', to_jsonb(now())) ON CONFLICT (key) DO NOTHING;

-- v20: video (Google Meet) and phone meetings between a learner and a staff member. A learner can ask to connect now
-- (an ISM is given a meeting starting in 30 minutes) or pick a time; staff can book meetings with their leads.
-- The exclusion constraint makes double-booking a host impossible, whatever code path creates the meeting.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS meet_url text;
CREATE TABLE IF NOT EXISTS meetings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  host_id            uuid NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  mode               text NOT NULL DEFAULT 'video' CHECK (mode IN ('video', 'phone')),
  kind               text NOT NULL CHECK (kind IN ('instant', 'scheduled')),
  starts_at          timestamptz NOT NULL,
  ends_at            timestamptz NOT NULL,
  meet_url           text,
  calendar_event_id  text,
  status             text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'no_show', 'cancelled')),
  requested_by       text NOT NULL CHECK (requested_by IN ('user', 'staff')),
  created_by         uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  source             text,
  note               text,
  cancel_reason      text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS meetings_user_idx ON meetings(user_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS meetings_host_idx ON meetings(host_id, starts_at);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meetings_no_clash') THEN
    ALTER TABLE meetings ADD CONSTRAINT meetings_no_clash
      EXCLUDE USING gist (host_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status = 'scheduled');
  END IF;
END $$;
-- Meetings are tasks for their host too (missed if no outcome within 1 hour of the start).
ALTER TABLE lead_tasks DROP CONSTRAINT IF EXISTS lead_tasks_kind_check;
ALTER TABLE lead_tasks ADD CONSTRAINT lead_tasks_kind_check CHECK (kind IN ('call_booked', 'call_request', 'follow_up', 'reminder', 'meeting'));

-- v21: 2026 catalogue projects carry their objective, what the learner achieves and the industry they come from.
-- catalogue_ref is the project's id in the catalogue (P01…), so re-importing the catalogue updates them in place.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS objective text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS outcome text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS catalogue_ref text;
CREATE UNIQUE INDEX IF NOT EXISTS projects_catalogue_ref_idx ON projects (catalogue_ref) WHERE catalogue_ref IS NOT NULL;
-- Programs merged in the 2026 catalogue: their projects also belong to the program that replaced them. The old ids stay
-- on the project, so Cloud & DevOps role-track projects still go only to learners in that role.
UPDATE projects SET programs = (SELECT array_agg(DISTINCT x) FROM unnest(programs || ARRAY['cloud-devops-engineering']) x)
 WHERE programs && ARRAY['advanced-cloud-devops', 'cloud-devops-network', 'cloud-devops-qa-testers', 'cloud-devops-sysadmin', 'cloud-devops-it-support-ops', 'cloud-devops-dba']
   AND NOT ('cloud-devops-engineering' = ANY(programs));
UPDATE projects SET programs = (SELECT array_agg(DISTINCT x) FROM unnest(programs || ARRAY['forward-deployed-ai-engineer']) x)
 WHERE 'ai-engineering-master' = ANY(programs) AND NOT ('forward-deployed-ai-engineer' = ANY(programs));

-- v22: Pseudo Sales CRM. Lead intelligence (intent score and AI summary of each learner's conversations and actions),
-- the link to the company CRM (matched by email or phone; an existing CRM record is never overwritten, only enriched),
-- and developer tools: API keys for the public API and signed outgoing webhooks with a delivery log.
CREATE TABLE IF NOT EXISTS lead_insights (
  user_id       uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  intent        int NOT NULL CHECK (intent BETWEEN 0 AND 100),
  band          text NOT NULL CHECK (band IN ('hot', 'warm', 'cold')),
  factors       jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary       jsonb,
  covers_until  timestamptz,
  generated_at  timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_insights_intent_idx ON lead_insights(intent DESC);
CREATE TABLE IF NOT EXISTS lead_external (
  user_id     uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  crm_id      text,
  existed     boolean NOT NULL DEFAULT false,
  matched_by  text CHECK (matched_by IN ('email', 'phone')),
  checked_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  prefix        text NOT NULL,
  key_hash      text NOT NULL UNIQUE,
  scopes        text[] NOT NULL DEFAULT ARRAY['read'],
  created_by    uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url          text NOT NULL CHECK (url LIKE 'https://%'),
  description  text,
  events       text[] NOT NULL,
  secret       text NOT NULL,
  active       boolean NOT NULL DEFAULT true,
  created_by   uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id           bigserial PRIMARY KEY,
  endpoint_id  uuid NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event        text NOT NULL,
  payload      jsonb NOT NULL,
  status       int,
  ok           boolean NOT NULL DEFAULT false,
  duration_ms  int,
  response     text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webhook_deliveries_endpoint_idx ON webhook_deliveries(endpoint_id, created_at DESC);

-- v23: reports rebuilt by the sales team. The answers staff logged on the call are kept with the report (the learner's
-- own profile is never changed from the CRM), and every earlier version of a report is kept for reference.
ALTER TABLE tool_results ADD COLUMN IF NOT EXISTS staff_answers jsonb;
ALTER TABLE tool_results ADD COLUMN IF NOT EXISTS generated_by uuid REFERENCES admin_users(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS tool_result_history (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool        text NOT NULL,
  data        jsonb NOT NULL,
  answers     jsonb,
  built_by    uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  built_at    timestamptz,
  replaced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tool_result_history_user_idx ON tool_result_history(user_id, tool, replaced_at DESC);

-- v24: projects that fit each learner. Work profiles (src/config/profiles.ts) tag projects written for them; AI
-- rewrites a learner's projects in their own context (cached); AI-proposed project ideas wait for an admin to approve
-- them into the library, so the library grows where real learners need it.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS profiles text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS projects_profiles_idx ON projects USING gin (profiles);
CREATE TABLE IF NOT EXISTS project_tailoring (
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  context_hash text NOT NULL,
  objective    text NOT NULL,
  outcome      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);
CREATE TABLE IF NOT EXISTS project_ideas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  objective     text NOT NULL,
  outcome       text,
  tools         text[] NOT NULL DEFAULT '{}',
  program_id    text NOT NULL,
  profiles      text[] NOT NULL DEFAULT '{}',
  industry      text,
  learner_brief text,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  seen          int NOT NULL DEFAULT 1,
  project_id    uuid REFERENCES projects(id) ON DELETE SET NULL,
  decided_by    uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  decided_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS project_ideas_title_idx ON project_ideas (lower(title), program_id);
CREATE INDEX IF NOT EXISTS project_ideas_status_idx ON project_ideas (status, seen DESC);
CREATE TABLE IF NOT EXISTS project_idea_learners (
  idea_id    uuid NOT NULL REFERENCES project_ideas(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (idea_id, user_id)
);

-- v25: hardening. A sign-up for an email that already exists is held here and applied only after the code proves the
-- email is theirs (nobody can overwrite someone else's name, phone or answers). Plus indexes for growth.
CREATE TABLE IF NOT EXISTS pending_signups (
  email         text PRIMARY KEY CHECK (email = lower(email)),
  name          text,
  phone_country text,
  phone         text,
  answers       jsonb NOT NULL DEFAULT '{}',
  source        jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS users_created_idx ON users (created_at DESC);
CREATE INDEX IF NOT EXISTS users_search_trgm ON users USING gin ((coalesce(name, '') || ' ' || email || ' ' || coalesce(phone, '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON rate_limits (window_start);
CREATE INDEX IF NOT EXISTS lead_events_type_idx ON lead_events (type, created_at);
CREATE INDEX IF NOT EXISTS lead_assignments_to_idx ON lead_assignments (to_id, created_at);
CREATE INDEX IF NOT EXISTS lead_tasks_done_by_idx ON lead_tasks (completed_by, completed_at) WHERE status = 'done';
CREATE INDEX IF NOT EXISTS lead_tasks_missed_idx ON lead_tasks (owner_id, missed_at) WHERE missed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS lead_owners_status_idx ON lead_owners (status, owner_id);
CREATE INDEX IF NOT EXISTS lead_activities_user_action_idx ON lead_activities (user_id, action);
CREATE INDEX IF NOT EXISTS tool_results_ready_idx ON tool_results (updated_at) WHERE status = 'ready';
CREATE INDEX IF NOT EXISTS assessments_updated_idx ON assessments (updated_at);
CREATE INDEX IF NOT EXISTS counsellor_requests_created_idx ON counsellor_requests (created_at);
CREATE INDEX IF NOT EXISTS project_idea_learners_user_idx ON project_idea_learners (user_id, created_at);
CREATE INDEX IF NOT EXISTS webhook_deliveries_created_idx ON webhook_deliveries (created_at);
