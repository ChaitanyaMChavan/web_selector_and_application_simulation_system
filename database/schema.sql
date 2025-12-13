-- =====================================================
-- Database Schema for Selector & Applicant Simulation System
-- Schema Name: projectweb
-- =====================================================

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS projectweb;
SET search_path TO projectweb;

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS projectweb.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'AUTHOR', 'SELECTOR', 'APPLICANT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON projectweb.users(email);
CREATE INDEX idx_users_role ON projectweb.users(role);

-- =====================================================
-- 2. SIMULATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS projectweb.simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
    time_limit_minutes INTEGER NOT NULL CHECK (time_limit_minutes >= 5 AND time_limit_minutes <= 180),
    author_id UUID NOT NULL REFERENCES projectweb.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_simulations_author_id ON projectweb.simulations(author_id);
CREATE INDEX idx_simulations_status ON projectweb.simulations(status);
CREATE INDEX idx_simulations_created_at ON projectweb.simulations(created_at);

-- =====================================================
-- 3. STEPS TABLE (Simulation Steps/Tasks)
-- =====================================================
CREATE TABLE IF NOT EXISTS projectweb.steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id UUID NOT NULL REFERENCES projectweb.simulations(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('MCQ', 'WRITTEN', 'VIDEO', 'CODING')),
    prompt TEXT NOT NULL,
    options JSONB, -- Array of strings for MCQ type, null for others
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(simulation_id, "order")
);

CREATE INDEX idx_steps_simulation_id ON projectweb.steps(simulation_id);
CREATE INDEX idx_steps_order ON projectweb.steps(simulation_id, "order");

-- =====================================================
-- 4. RUBRICS TABLE (For subjective task evaluation)
-- =====================================================
CREATE TABLE IF NOT EXISTS projectweb.rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id UUID NOT NULL REFERENCES projectweb.steps(id) ON DELETE CASCADE,
    criterion_name VARCHAR(255) NOT NULL,
    description TEXT,
    max_score INTEGER NOT NULL DEFAULT 10 CHECK (max_score > 0),
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(step_id, "order")
);

CREATE INDEX idx_rubrics_step_id ON projectweb.rubrics(step_id);

-- =====================================================
-- 5. ATTEMPTS TABLE (Applicant assessment attempts)
-- =====================================================
CREATE TABLE IF NOT EXISTS projectweb.attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id UUID NOT NULL REFERENCES projectweb.simulations(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES projectweb.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'SCORED')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP WITH TIME ZONE,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    feedback TEXT,
    scored_at TIMESTAMP WITH TIME ZONE,
    scored_by UUID REFERENCES projectweb.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attempts_simulation_id ON projectweb.attempts(simulation_id);
CREATE INDEX idx_attempts_applicant_id ON projectweb.attempts(applicant_id);
CREATE INDEX idx_attempts_status ON projectweb.attempts(status);
CREATE INDEX idx_attempts_scored_by ON projectweb.attempts(scored_by);
CREATE INDEX idx_attempts_submitted_at ON projectweb.attempts(submitted_at);

-- Partial unique index: Only one IN_PROGRESS attempt per simulation and applicant
CREATE UNIQUE INDEX idx_attempts_unique_in_progress 
ON projectweb.attempts(simulation_id, applicant_id) 
WHERE status = 'IN_PROGRESS';

-- =====================================================
-- 6. RESPONSES TABLE (Answers to simulation steps)
-- =====================================================
CREATE TABLE IF NOT EXISTS projectweb.responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES projectweb.attempts(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES projectweb.steps(id) ON DELETE CASCADE,
    answer TEXT NOT NULL, -- Can be text, JSON for MCQ, or file URL for video/coding
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(attempt_id, step_id)
);

CREATE INDEX idx_responses_attempt_id ON projectweb.responses(attempt_id);
CREATE INDEX idx_responses_step_id ON projectweb.responses(step_id);

-- =====================================================
-- 7. SCORES TABLE (Detailed rubric-based scores)
-- =====================================================
CREATE TABLE IF NOT EXISTS projectweb.scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES projectweb.attempts(id) ON DELETE CASCADE,
    rubric_id UUID NOT NULL REFERENCES projectweb.rubrics(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0),
    comment TEXT,
    scored_by UUID NOT NULL REFERENCES projectweb.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(attempt_id, rubric_id, scored_by)
);

CREATE INDEX idx_scores_attempt_id ON projectweb.scores(attempt_id);
CREATE INDEX idx_scores_rubric_id ON projectweb.scores(rubric_id);
CREATE INDEX idx_scores_scored_by ON projectweb.scores(scored_by);

-- =====================================================
-- 8. REFRESH TOKENS TABLE (For JWT refresh token management)
-- =====================================================
CREATE TABLE IF NOT EXISTS projectweb.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES projectweb.users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON projectweb.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON projectweb.refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON projectweb.refresh_tokens(expires_at);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION projectweb.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON projectweb.users
    FOR EACH ROW EXECUTE FUNCTION projectweb.update_updated_at_column();

CREATE TRIGGER update_simulations_updated_at BEFORE UPDATE ON projectweb.simulations
    FOR EACH ROW EXECUTE FUNCTION projectweb.update_updated_at_column();

CREATE TRIGGER update_attempts_updated_at BEFORE UPDATE ON projectweb.attempts
    FOR EACH ROW EXECUTE FUNCTION projectweb.update_updated_at_column();

CREATE TRIGGER update_responses_updated_at BEFORE UPDATE ON projectweb.responses
    FOR EACH ROW EXECUTE FUNCTION projectweb.update_updated_at_column();

CREATE TRIGGER update_scores_updated_at BEFORE UPDATE ON projectweb.scores
    FOR EACH ROW EXECUTE FUNCTION projectweb.update_updated_at_column();

-- =====================================================
-- INITIAL DATA (Optional - Admin user)
-- =====================================================

-- Note: Password should be hashed using bcrypt
-- Default password: 'admin123' (hash: $2b$10$...)
-- You should generate a proper hash for production

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for simulation with step count
CREATE OR REPLACE VIEW projectweb.simulations_with_counts AS
SELECT 
    s.*,
    COUNT(st.id) as step_count
FROM projectweb.simulations s
LEFT JOIN projectweb.steps st ON s.id = st.simulation_id
GROUP BY s.id;

-- View for pending attempts for selectors
CREATE OR REPLACE VIEW projectweb.pending_attempts_view AS
SELECT 
    a.id,
    a.status,
    a.submitted_at,
    s.id as simulation_id,
    s.title as simulation_title,
    u.id as applicant_id,
    u.name as applicant_name,
    u.email as applicant_email
FROM projectweb.attempts a
JOIN projectweb.simulations s ON a.simulation_id = s.id
JOIN projectweb.users u ON a.applicant_id = u.id
WHERE a.status = 'SUBMITTED';

-- =====================================================
-- GRANTS (Adjust based on your database user setup)
-- =====================================================

-- Grant permissions (replace 'your_app_user' with your actual database user)
-- GRANT USAGE ON SCHEMA projectweb TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA projectweb TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA projectweb TO your_app_user;

-- =====================================================
-- END OF SCHEMA
-- =====================================================

