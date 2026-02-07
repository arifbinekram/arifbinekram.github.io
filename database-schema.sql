-- ============================================================================
-- JobHunt Pro - PostgreSQL Database Schema
-- Production-ready schema with proper indexing, constraints, and relationships
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'recruiter')),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- User profiles (one-to-one with users)
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    location VARCHAR(255),
    bio TEXT,
    years_experience INTEGER,
    resume_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User skills (many-to-many relationship)
CREATE TABLE user_skills (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill VARCHAR(100),
    proficiency VARCHAR(50) CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_of_experience INTEGER,
    PRIMARY KEY (user_id, skill),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- COMPANIES TABLE
-- ============================================================================

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    website VARCHAR(500),
    logo_url VARCHAR(500),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    headquarters VARCHAR(255),
    founded_year INTEGER,
    tier VARCHAR(50) CHECK (tier IN ('FAANG', 'Big Tech', 'Unicorn', 'Startup', 'Enterprise')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Company benefits
CREATE TABLE company_benefits (
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    benefit VARCHAR(255),
    PRIMARY KEY (company_id, benefit)
);

-- ============================================================================
-- JOBS TABLE
-- ============================================================================

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    responsibilities TEXT,
    location VARCHAR(255),
    job_type VARCHAR(50) CHECK (job_type IN ('Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary')),
    work_mode VARCHAR(50) CHECK (work_mode IN ('Remote', 'Hybrid', 'On-site')),
    experience_level VARCHAR(50) CHECK (experience_level IN ('Entry', 'Mid', 'Senior', 'Lead', 'Principal', 'Executive')),
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency VARCHAR(10) DEFAULT 'USD',
    equity_offered BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_urgent BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'closed', 'filled')),
    views_count INTEGER DEFAULT 0,
    applications_count INTEGER DEFAULT 0,
    posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job required skills
CREATE TABLE job_skills (
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    skill VARCHAR(100),
    is_required BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (job_id, skill)
);

-- Job benefits
CREATE TABLE job_benefits (
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    benefit VARCHAR(255),
    PRIMARY KEY (job_id, benefit)
);

-- ============================================================================
-- APPLICATIONS TABLE
-- ============================================================================

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'phone_screen', 'technical_interview', 'final_interview', 'offer_extended', 'accepted', 'rejected', 'withdrawn')),
    cover_letter TEXT,
    resume_url VARCHAR(500),
    additional_info JSONB,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    status_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, user_id)
);

-- Application notes (for recruiters)
CREATE TABLE application_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    note TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SAVED JOBS TABLE
-- ============================================================================

CREATE TABLE saved_jobs (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, job_id)
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ACTIVITY LOG TABLE
-- ============================================================================

CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ANALYTICS TABLES
-- ============================================================================

-- Job views tracking
CREATE TABLE job_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    ip_address INET,
    referrer VARCHAR(500),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Search queries tracking
CREATE TABLE search_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    filters JSONB,
    results_count INTEGER,
    clicked_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Jobs indexes
CREATE INDEX idx_jobs_company_id ON jobs(company_id);
CREATE INDEX idx_jobs_category ON jobs(category);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_experience_level ON jobs(experience_level);
CREATE INDEX idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX idx_jobs_salary ON jobs(salary_max DESC);
CREATE INDEX idx_jobs_featured ON jobs(is_featured) WHERE is_featured = TRUE;

-- Full-text search indexes
CREATE INDEX idx_jobs_title_search ON jobs USING gin(to_tsvector('english', title));
CREATE INDEX idx_jobs_description_search ON jobs USING gin(to_tsvector('english', description));
CREATE INDEX idx_companies_name_search ON companies USING gin(to_tsvector('english', name));

-- Applications indexes
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_submitted_at ON applications(submitted_at DESC);

-- Saved jobs indexes
CREATE INDEX idx_saved_jobs_user_id ON saved_jobs(user_id);
CREATE INDEX idx_saved_jobs_saved_at ON saved_jobs(saved_at DESC);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Activity log indexes
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- Analytics indexes
CREATE INDEX idx_job_views_job_id ON job_views(job_id);
CREATE INDEX idx_job_views_viewed_at ON job_views(viewed_at DESC);
CREATE INDEX idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX idx_search_queries_searched_at ON search_queries(searched_at DESC);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment job views count
CREATE OR REPLACE FUNCTION increment_job_views()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE jobs SET views_count = views_count + 1 WHERE id = NEW.job_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_increment_job_views AFTER INSERT ON job_views
    FOR EACH ROW EXECUTE FUNCTION increment_job_views();

-- Function to increment applications count
CREATE OR REPLACE FUNCTION increment_applications_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE jobs SET applications_count = applications_count + 1 WHERE id = NEW.job_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_increment_applications_count AFTER INSERT ON applications
    FOR EACH ROW EXECUTE FUNCTION increment_applications_count();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active jobs with company info
CREATE VIEW active_jobs_view AS
SELECT 
    j.*,
    c.name as company_name,
    c.logo_url as company_logo,
    c.tier as company_tier,
    c.industry as company_industry,
    (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as total_applications,
    (SELECT array_agg(skill) FROM job_skills WHERE job_id = j.id) as required_skills,
    (SELECT array_agg(benefit) FROM job_benefits WHERE job_id = j.id) as benefits
FROM jobs j
JOIN companies c ON j.company_id = c.id
WHERE j.status = 'active' AND (j.expires_at IS NULL OR j.expires_at > CURRENT_TIMESTAMP);

-- User application stats
CREATE VIEW user_application_stats AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    COUNT(a.id) as total_applications,
    COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_applications,
    COUNT(CASE WHEN a.status = 'accepted' THEN 1 END) as accepted_applications,
    COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected_applications
FROM users u
LEFT JOIN applications a ON u.id = a.user_id
GROUP BY u.id, u.name, u.email;

-- Company job stats
CREATE VIEW company_job_stats AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    COUNT(j.id) as total_jobs,
    COUNT(CASE WHEN j.status = 'active' THEN 1 END) as active_jobs,
    SUM(j.applications_count) as total_applications,
    AVG(j.salary_max) as avg_max_salary
FROM companies c
LEFT JOIN jobs j ON c.id = j.company_id
GROUP BY c.id, c.name;

-- ============================================================================
-- SAMPLE DATA FOR DEVELOPMENT
-- ============================================================================

-- Insert sample companies
INSERT INTO companies (id, name, slug, tier, industry, company_size, founded_year)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Google', 'google', 'FAANG', 'Technology', '100k+', 1998),
    ('22222222-2222-2222-2222-222222222222', 'Meta', 'meta', 'FAANG', 'Technology', '50k+', 2004),
    ('33333333-3333-3333-3333-333333333333', 'Amazon', 'amazon', 'FAANG', 'E-commerce', '1M+', 1994),
    ('44444444-4444-4444-4444-444444444444', 'Apple', 'apple', 'FAANG', 'Technology', '150k+', 1976),
    ('55555555-5555-5555-5555-555555555555', 'Netflix', 'netflix', 'FAANG', 'Entertainment', '10k+', 1997);

-- ============================================================================
-- SECURITY POLICIES (Row Level Security)
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY user_select_own ON users
    FOR SELECT
    USING (id = current_setting('app.current_user_id')::UUID);

CREATE POLICY user_update_own ON users
    FOR UPDATE
    USING (id = current_setting('app.current_user_id')::UUID);

-- Applications policy
CREATE POLICY application_select_own ON applications
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY application_insert_own ON applications
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id')::UUID);

-- ============================================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ============================================================================

-- Function to check if user can apply to job
CREATE OR REPLACE FUNCTION can_user_apply_to_job(p_user_id UUID, p_job_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    already_applied BOOLEAN;
    job_active BOOLEAN;
BEGIN
    -- Check if already applied
    SELECT EXISTS (
        SELECT 1 FROM applications 
        WHERE user_id = p_user_id AND job_id = p_job_id
    ) INTO already_applied;
    
    IF already_applied THEN
        RETURN FALSE;
    END IF;
    
    -- Check if job is active
    SELECT (status = 'active' AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP))
    INTO job_active
    FROM jobs
    WHERE id = p_job_id;
    
    RETURN COALESCE(job_active, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Function to get job recommendations for user
CREATE OR REPLACE FUNCTION get_job_recommendations(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    job_id UUID,
    title VARCHAR,
    company_name VARCHAR,
    match_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.id,
        j.title,
        c.name,
        (
            -- Calculate match score based on user skills
            SELECT COUNT(*)::INTEGER
            FROM job_skills js
            WHERE js.job_id = j.id 
            AND js.skill IN (SELECT skill FROM user_skills WHERE user_id = p_user_id)
        ) as match_score
    FROM jobs j
    JOIN companies c ON j.company_id = c.id
    WHERE j.status = 'active'
    AND j.id NOT IN (SELECT job_id FROM applications WHERE user_id = p_user_id)
    ORDER BY match_score DESC, j.posted_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- Daily job stats
CREATE MATERIALIZED VIEW daily_job_stats AS
SELECT 
    DATE(posted_at) as date,
    category,
    COUNT(*) as jobs_posted,
    AVG(salary_max) as avg_salary,
    COUNT(DISTINCT company_id) as unique_companies
FROM jobs
GROUP BY DATE(posted_at), category
ORDER BY date DESC;

CREATE INDEX idx_daily_job_stats_date ON daily_job_stats(date DESC);

-- Refresh materialized view function (call daily via cron)
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_job_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE users IS 'Stores user account information';
COMMENT ON TABLE jobs IS 'Job postings from companies';
COMMENT ON TABLE applications IS 'User applications to jobs';
COMMENT ON COLUMN jobs.salary_min IS 'Minimum salary in USD';
COMMENT ON COLUMN jobs.salary_max IS 'Maximum salary in USD';
COMMENT ON FUNCTION can_user_apply_to_job IS 'Checks if user is eligible to apply to a job';
COMMENT ON VIEW active_jobs_view IS 'All active jobs with company details';

