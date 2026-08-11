CREATE TABLE app_users (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(320) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    default_focus_minutes INTEGER NOT NULL DEFAULT 25 CHECK (default_focus_minutes BETWEEN 1 AND 240),
    default_break_minutes INTEGER NOT NULL DEFAULT 5 CHECK (default_break_minutes BETWEEN 1 AND 120),
    long_break_minutes INTEGER NOT NULL DEFAULT 15 CHECK (long_break_minutes BETWEEN 1 AND 120),
    sessions_before_long_break INTEGER NOT NULL DEFAULT 4 CHECK (sessions_before_long_break BETWEEN 1 AND 12),
    theme VARCHAR(16) NOT NULL DEFAULT 'SYSTEM',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_app_users_email UNIQUE (email)
);

CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    browser_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_notification_preferences_user UNIQUE (user_id),
    CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    family_id UUID NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    replaced_by_hash VARCHAR(64),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE TABLE habits (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(1000),
    type VARCHAR(16) NOT NULL,
    target_value NUMERIC(12,2) NOT NULL CHECK (target_value > 0),
    unit VARCHAR(32),
    schedule_type VARCHAR(24) NOT NULL,
    weekdays VARCHAR(32),
    times_per_week INTEGER CHECK (times_per_week BETWEEN 1 AND 7),
    interval_days INTEGER CHECK (interval_days BETWEEN 2 AND 30),
    schedule_start_date DATE,
    reminder_time TIME,
    color VARCHAR(24) NOT NULL DEFAULT 'moss',
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_habits_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE INDEX idx_habits_user_archived ON habits(user_id, archived_at);

CREATE TABLE habit_entries (
    id UUID PRIMARY KEY,
    habit_id UUID NOT NULL,
    entry_date DATE NOT NULL,
    progress_value NUMERIC(12,2) NOT NULL CHECK (progress_value >= 0),
    note VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_habit_entries_habit_date UNIQUE (habit_id, entry_date),
    CONSTRAINT fk_habit_entries_habit FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
);

CREATE INDEX idx_habit_entries_habit_date ON habit_entries(habit_id, entry_date DESC);

CREATE TABLE projects (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(1000),
    color VARCHAR(24) NOT NULL DEFAULT 'ink',
    icon VARCHAR(32),
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE INDEX idx_projects_user_archived ON projects(user_id, archived_at);

CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    project_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(1000),
    due_date DATE,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_user_project ON tasks(user_id, project_id);
CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_date, status);

CREATE TABLE focus_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    project_id UUID,
    task_id UUID,
    habit_id UUID,
    status VARCHAR(16) NOT NULL,
    planned_duration_minutes INTEGER NOT NULL CHECK (planned_duration_minutes BETWEEN 1 AND 240),
    actual_duration_minutes INTEGER CHECK (actual_duration_minutes >= 0),
    started_at TIMESTAMP WITH TIME ZONE,
    expected_end_at TIMESTAMP WITH TIME ZONE,
    paused_at TIMESTAMP WITH TIME ZONE,
    total_paused_seconds BIGINT NOT NULL DEFAULT 0 CHECK (total_paused_seconds >= 0),
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_focus_sessions_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_focus_sessions_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    CONSTRAINT fk_focus_sessions_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    CONSTRAINT fk_focus_sessions_habit FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE SET NULL
);

CREATE INDEX idx_focus_sessions_user_status ON focus_sessions(user_id, status);
CREATE INDEX idx_focus_sessions_user_completed ON focus_sessions(user_id, completed_at DESC);
CREATE INDEX idx_focus_sessions_project ON focus_sessions(project_id, completed_at DESC);
CREATE INDEX idx_focus_sessions_task ON focus_sessions(task_id, completed_at DESC);
CREATE INDEX idx_focus_sessions_habit ON focus_sessions(habit_id, completed_at DESC);

CREATE TABLE focus_interruptions (
    id UUID PRIMARY KEY,
    focus_session_id UUID NOT NULL,
    kind VARCHAR(16) NOT NULL,
    note VARCHAR(500),
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_focus_interruptions_session FOREIGN KEY (focus_session_id) REFERENCES focus_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_focus_interruptions_session ON focus_interruptions(focus_session_id, occurred_at);

CREATE TABLE daily_metrics (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    metric_date DATE NOT NULL,
    focus_minutes INTEGER NOT NULL DEFAULT 0,
    completed_sessions INTEGER NOT NULL DEFAULT 0,
    cancelled_sessions INTEGER NOT NULL DEFAULT 0,
    interruption_count INTEGER NOT NULL DEFAULT 0,
    habit_completions INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_daily_metrics_user_date UNIQUE (user_id, metric_date),
    CONSTRAINT fk_daily_metrics_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE INDEX idx_daily_metrics_user_date ON daily_metrics(user_id, metric_date DESC);

CREATE TABLE weekly_metrics (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    week_start DATE NOT NULL,
    focus_minutes INTEGER NOT NULL DEFAULT 0,
    completed_sessions INTEGER NOT NULL DEFAULT 0,
    cancelled_sessions INTEGER NOT NULL DEFAULT 0,
    interruption_count INTEGER NOT NULL DEFAULT 0,
    habit_completions INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_weekly_metrics_user_week UNIQUE (user_id, week_start),
    CONSTRAINT fk_weekly_metrics_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE INDEX idx_weekly_metrics_user_week ON weekly_metrics(user_id, week_start DESC);
