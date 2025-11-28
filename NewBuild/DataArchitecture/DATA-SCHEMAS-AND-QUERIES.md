# Data Schemas and Query Examples for AiDefRef
## Production-Ready Schemas and Analytics Queries

---

## 1. Core Data Schemas

### 1.1 User Profile Schema
```sql
-- Azure SQL Database / Synapse Analytics
CREATE TABLE dbo.UserProfiles (
    user_id UNIQUEIDENTIFIER PRIMARY KEY,
    email_hash VARCHAR(64) NOT NULL, -- SHA-256 hash for privacy
    account_type VARCHAR(20) CHECK (account_type IN ('free', 'trial', 'pro', 'enterprise')),
    subscription_status VARCHAR(20) CHECK (subscription_status IN ('active', 'cancelled', 'suspended', 'expired')),
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    last_login_at DATETIME2,

    -- Demographics (anonymized)
    country_code VARCHAR(2),
    timezone VARCHAR(50),
    language_preference VARCHAR(10),

    -- Business fields
    company_size VARCHAR(20),
    industry VARCHAR(100),
    use_case VARCHAR(100),

    -- Enriched data from OSINT
    linkedin_profile_id VARCHAR(100),
    github_username VARCHAR(100),
    professional_title VARCHAR(200),
    years_experience INT,

    -- Compliance fields
    gdpr_consent BIT DEFAULT 0,
    ccpa_consent BIT DEFAULT 0,
    marketing_consent BIT DEFAULT 0,
    data_retention_consent BIT DEFAULT 1,
    deletion_requested_at DATETIME2,

    -- Metadata
    enrichment_score FLOAT,
    risk_score FLOAT,
    churn_probability FLOAT,
    ltv_prediction DECIMAL(10,2),

    INDEX idx_account_type (account_type),
    INDEX idx_created_at (created_at),
    INDEX idx_country (country_code),
    INDEX idx_deletion_requested (deletion_requested_at) WHERE deletion_requested_at IS NOT NULL
);
```

### 1.2 User Interactions Event Schema
```sql
-- For real-time processing (Cosmos DB)
{
    "id": "{{guid}}",
    "userId": "{{user_id}}",
    "sessionId": "{{session_id}}",
    "eventType": "user_interaction",
    "eventName": "{{event_name}}",
    "timestamp": "{{ISO-8601}}",
    "properties": {
        "page": "{{page_name}}",
        "action": "{{action_type}}",
        "element": "{{element_id}}",
        "value": "{{interaction_value}}"
    },
    "context": {
        "ip_hash": "{{hashed_ip}}",
        "user_agent": "{{user_agent}}",
        "device_type": "{{desktop|mobile|tablet}}",
        "browser": "{{browser_name}}",
        "os": "{{os_name}}",
        "screen_resolution": "{{width}}x{{height}}",
        "viewport": "{{width}}x{{height}}",
        "referrer": "{{referrer_url}}",
        "utm_source": "{{utm_source}}",
        "utm_medium": "{{utm_medium}}",
        "utm_campaign": "{{utm_campaign}}"
    },
    "performance": {
        "page_load_time": {{milliseconds}},
        "dom_ready_time": {{milliseconds}},
        "time_to_interactive": {{milliseconds}}
    },
    "_ts": {{unix_timestamp}},
    "ttl": 604800  // 7 days for hot data
}
```

### 1.3 AI Interactions Schema
```sql
CREATE TABLE dbo.AIInteractions (
    interaction_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    session_id UNIQUEIDENTIFIER NOT NULL,

    -- Prompt details
    prompt_timestamp DATETIME2 NOT NULL,
    prompt_text_hash VARCHAR(64), -- Store hash for privacy
    prompt_tokens INT,
    prompt_category VARCHAR(50),
    prompt_intent VARCHAR(100),

    -- Response details
    response_timestamp DATETIME2,
    response_tokens INT,
    model_name VARCHAR(50),
    model_version VARCHAR(20),

    -- Performance metrics
    latency_ms INT,
    processing_time_ms INT,
    queue_time_ms INT,

    -- Quality metrics
    confidence_score FLOAT,
    relevance_score FLOAT,
    user_rating INT CHECK (user_rating BETWEEN 1 AND 5),
    was_edited BIT DEFAULT 0,
    was_regenerated BIT DEFAULT 0,

    -- Usage and cost
    api_calls_count INT DEFAULT 1,
    total_tokens INT,
    estimated_cost DECIMAL(10,4),

    -- Reference specific
    reference_type VARCHAR(50),
    citation_style VARCHAR(20),
    sources_count INT,

    FOREIGN KEY (user_id) REFERENCES UserProfiles(user_id),
    INDEX idx_user_timestamp (user_id, prompt_timestamp),
    INDEX idx_session (session_id),
    INDEX idx_model (model_name, model_version)
);
```

### 1.4 Document References Schema
```sql
CREATE TABLE dbo.DocumentReferences (
    reference_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    document_id UNIQUEIDENTIFIER NOT NULL,

    -- Reference metadata
    reference_type VARCHAR(50) NOT NULL,
    citation_style VARCHAR(20) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    -- Content (encrypted)
    title_encrypted VARBINARY(MAX),
    authors_encrypted VARBINARY(MAX),
    publication_encrypted VARBINARY(MAX),
    year_published INT,

    -- Source information
    source_url VARCHAR(500),
    source_type VARCHAR(50),
    doi VARCHAR(100),
    isbn VARCHAR(20),

    -- Quality metrics
    quality_score FLOAT,
    completeness_score FLOAT,
    accuracy_verified BIT DEFAULT 0,

    -- Usage tracking
    times_used INT DEFAULT 0,
    times_exported INT DEFAULT 0,
    last_accessed_at DATETIME2,

    -- Collaboration
    is_shared BIT DEFAULT 0,
    share_count INT DEFAULT 0,

    FOREIGN KEY (user_id) REFERENCES UserProfiles(user_id),
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_document (document_id),
    INDEX idx_citation_style (citation_style)
);
```

### 1.5 Subscription and Billing Schema
```sql
CREATE TABLE dbo.Subscriptions (
    subscription_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,

    -- Subscription details
    plan_name VARCHAR(50) NOT NULL,
    plan_tier VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,

    -- Billing
    monthly_amount DECIMAL(10,2),
    annual_amount DECIMAL(10,2),
    billing_cycle VARCHAR(20),
    currency_code VARCHAR(3),

    -- Dates
    trial_start_date DATE,
    trial_end_date DATE,
    subscription_start_date DATE NOT NULL,
    subscription_end_date DATE,
    cancelled_at DATETIME2,

    -- Payment
    payment_method VARCHAR(20),
    last_payment_date DATE,
    next_billing_date DATE,
    failed_payment_count INT DEFAULT 0,

    -- Usage limits
    monthly_ai_calls_limit INT,
    monthly_storage_limit_gb INT,
    monthly_export_limit INT,

    -- Metadata
    acquisition_channel VARCHAR(50),
    referral_code VARCHAR(50),
    discount_percentage FLOAT,

    FOREIGN KEY (user_id) REFERENCES UserProfiles(user_id),
    INDEX idx_status (status),
    INDEX idx_next_billing (next_billing_date) WHERE next_billing_date IS NOT NULL
);
```

---

## 2. Analytics and Aggregation Tables

### 2.1 Daily User Metrics
```sql
CREATE TABLE dbo.DailyUserMetrics (
    date DATE NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,

    -- Activity metrics
    sessions_count INT,
    total_events INT,
    unique_pages_viewed INT,
    total_time_seconds INT,

    -- AI usage
    ai_prompts_count INT,
    ai_tokens_used INT,
    ai_regenerations INT,
    ai_average_rating FLOAT,

    -- Document metrics
    documents_created INT,
    documents_edited INT,
    references_added INT,
    exports_count INT,

    -- Engagement score
    engagement_score FLOAT,

    PRIMARY KEY (date, user_id),
    INDEX idx_date (date)
);

-- Materialized view for faster queries
CREATE MATERIALIZED VIEW mv_weekly_user_summary AS
SELECT
    DATEPART(year, date) as year,
    DATEPART(week, date) as week,
    user_id,
    SUM(sessions_count) as weekly_sessions,
    SUM(ai_prompts_count) as weekly_prompts,
    AVG(engagement_score) as avg_engagement
FROM DailyUserMetrics
GROUP BY DATEPART(year, date), DATEPART(week, date), user_id
WITH (DISTRIBUTION = HASH(user_id));
```

### 2.2 Feature Usage Analytics
```sql
CREATE TABLE dbo.FeatureUsageMetrics (
    date DATE NOT NULL,
    feature_name VARCHAR(100) NOT NULL,

    -- Usage metrics
    unique_users INT,
    total_uses INT,
    success_count INT,
    error_count INT,

    -- Performance
    avg_latency_ms FLOAT,
    p95_latency_ms FLOAT,
    p99_latency_ms FLOAT,

    -- User segments
    free_tier_users INT,
    paid_tier_users INT,
    enterprise_users INT,

    -- Adoption
    first_time_users INT,
    returning_users INT,
    adoption_rate FLOAT,

    PRIMARY KEY (date, feature_name),
    INDEX idx_feature (feature_name)
);
```

---

## 3. Example Analytics Queries

### 3.1 User Retention Analysis
```sql
-- Calculate weekly retention cohorts
WITH CohortUsers AS (
    SELECT
        user_id,
        DATE_TRUNC('week', created_at) as cohort_week,
        DATEDIFF(week, created_at, GETUTCDATE()) as weeks_since_signup
    FROM UserProfiles
    WHERE created_at >= DATEADD(month, -3, GETUTCDATE())
),
RetentionData AS (
    SELECT
        cu.cohort_week,
        cu.weeks_since_signup,
        COUNT(DISTINCT cu.user_id) as cohort_size,
        COUNT(DISTINCT CASE WHEN dm.date IS NOT NULL THEN cu.user_id END) as retained_users
    FROM CohortUsers cu
    LEFT JOIN DailyUserMetrics dm
        ON cu.user_id = dm.user_id
        AND dm.date >= DATEADD(week, cu.weeks_since_signup, cu.cohort_week)
        AND dm.date < DATEADD(week, cu.weeks_since_signup + 1, cu.cohort_week)
    GROUP BY cu.cohort_week, cu.weeks_since_signup
)
SELECT
    cohort_week,
    weeks_since_signup,
    cohort_size,
    retained_users,
    CAST(retained_users AS FLOAT) / NULLIF(cohort_size, 0) * 100 as retention_rate
FROM RetentionData
ORDER BY cohort_week, weeks_since_signup;
```

### 3.2 Revenue Analytics
```sql
-- Monthly Recurring Revenue (MRR) with growth metrics
WITH MonthlyRevenue AS (
    SELECT
        DATE_TRUNC('month', subscription_start_date) as month,
        SUM(CASE
            WHEN billing_cycle = 'monthly' THEN monthly_amount
            WHEN billing_cycle = 'annual' THEN annual_amount / 12
        END) as mrr,
        COUNT(DISTINCT user_id) as customer_count,
        SUM(CASE WHEN plan_tier = 'enterprise' THEN
            CASE
                WHEN billing_cycle = 'monthly' THEN monthly_amount
                WHEN billing_cycle = 'annual' THEN annual_amount / 12
            END
        END) as enterprise_mrr
    FROM Subscriptions
    WHERE status = 'active'
    GROUP BY DATE_TRUNC('month', subscription_start_date)
),
MRRGrowth AS (
    SELECT
        month,
        mrr,
        customer_count,
        enterprise_mrr,
        LAG(mrr) OVER (ORDER BY month) as previous_mrr,
        LAG(customer_count) OVER (ORDER BY month) as previous_customers
    FROM MonthlyRevenue
)
SELECT
    month,
    mrr,
    customer_count,
    enterprise_mrr,
    enterprise_mrr / NULLIF(mrr, 0) * 100 as enterprise_percentage,
    mrr - COALESCE(previous_mrr, 0) as mrr_growth,
    (mrr - COALESCE(previous_mrr, 0)) / NULLIF(previous_mrr, 0) * 100 as mrr_growth_rate,
    customer_count - COALESCE(previous_customers, 0) as customer_growth,
    mrr / NULLIF(customer_count, 0) as arpu
FROM MRRGrowth
ORDER BY month DESC;
```

### 3.3 AI Usage Patterns
```sql
-- Analyze AI model performance and user satisfaction
SELECT
    DATE_TRUNC('day', prompt_timestamp) as date,
    model_name,
    COUNT(*) as total_prompts,
    AVG(latency_ms) as avg_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency,
    AVG(confidence_score) as avg_confidence,
    AVG(CASE WHEN user_rating IS NOT NULL THEN user_rating END) as avg_rating,
    SUM(CASE WHEN was_regenerated = 1 THEN 1 ELSE 0 END) as regeneration_count,
    SUM(CASE WHEN was_regenerated = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as regeneration_rate,
    SUM(total_tokens) as total_tokens_used,
    SUM(estimated_cost) as total_cost
FROM AIInteractions
WHERE prompt_timestamp >= DATEADD(day, -30, GETUTCDATE())
GROUP BY DATE_TRUNC('day', prompt_timestamp), model_name
ORDER BY date DESC, total_prompts DESC;
```

### 3.4 Feature Adoption Funnel
```sql
-- Track feature adoption through user journey
WITH FeatureFunnel AS (
    SELECT
        up.user_id,
        up.created_at as signup_date,
        MIN(CASE WHEN ai.interaction_id IS NOT NULL THEN ai.prompt_timestamp END) as first_ai_use,
        MIN(CASE WHEN dr.reference_id IS NOT NULL THEN dr.created_at END) as first_reference,
        MIN(CASE WHEN s.subscription_id IS NOT NULL AND s.plan_tier != 'free'
            THEN s.subscription_start_date END) as first_paid_subscription
    FROM UserProfiles up
    LEFT JOIN AIInteractions ai ON up.user_id = ai.user_id
    LEFT JOIN DocumentReferences dr ON up.user_id = dr.user_id
    LEFT JOIN Subscriptions s ON up.user_id = s.user_id
    WHERE up.created_at >= DATEADD(month, -3, GETUTCDATE())
    GROUP BY up.user_id, up.created_at
)
SELECT
    COUNT(*) as total_signups,
    COUNT(first_ai_use) as used_ai,
    COUNT(first_reference) as created_reference,
    COUNT(first_paid_subscription) as converted_to_paid,

    COUNT(first_ai_use) * 100.0 / COUNT(*) as ai_adoption_rate,
    COUNT(first_reference) * 100.0 / COUNT(*) as reference_adoption_rate,
    COUNT(first_paid_subscription) * 100.0 / COUNT(*) as conversion_rate,

    AVG(DATEDIFF(hour, signup_date, first_ai_use)) as avg_hours_to_first_ai,
    AVG(DATEDIFF(day, signup_date, first_paid_subscription)) as avg_days_to_conversion
FROM FeatureFunnel;
```

### 3.5 Churn Prediction Data
```sql
-- Generate features for churn prediction model
WITH UserActivity AS (
    SELECT
        u.user_id,
        u.account_type,
        DATEDIFF(day, u.created_at, GETUTCDATE()) as account_age_days,
        DATEDIFF(day, u.last_login_at, GETUTCDATE()) as days_since_login,

        -- Activity in last 30 days
        COALESCE(SUM(dm.sessions_count), 0) as sessions_30d,
        COALESCE(SUM(dm.ai_prompts_count), 0) as ai_prompts_30d,
        COALESCE(SUM(dm.documents_created + dm.documents_edited), 0) as documents_30d,
        COALESCE(AVG(dm.engagement_score), 0) as avg_engagement_30d,

        -- Subscription info
        s.plan_tier,
        s.monthly_amount,
        DATEDIFF(day, s.subscription_start_date, GETUTCDATE()) as subscription_age_days,
        s.failed_payment_count,

        -- Usage trends
        LAG(SUM(dm.sessions_count), 1) OVER (PARTITION BY u.user_id ORDER BY dm.date) as prev_month_sessions,

        -- Churn label (no activity in last 30 days)
        CASE WHEN MAX(dm.date) < DATEADD(day, -30, GETUTCDATE()) THEN 1 ELSE 0 END as is_churned

    FROM UserProfiles u
    LEFT JOIN DailyUserMetrics dm
        ON u.user_id = dm.user_id
        AND dm.date >= DATEADD(day, -30, GETUTCDATE())
    LEFT JOIN Subscriptions s
        ON u.user_id = s.user_id
        AND s.status = 'active'
    GROUP BY u.user_id, u.account_type, u.created_at, u.last_login_at,
             s.plan_tier, s.monthly_amount, s.subscription_start_date, s.failed_payment_count
)
SELECT
    user_id,
    account_age_days,
    days_since_login,
    sessions_30d,
    ai_prompts_30d,
    documents_30d,
    avg_engagement_30d,
    plan_tier,
    monthly_amount,
    subscription_age_days,
    failed_payment_count,

    -- Derived features
    CASE WHEN prev_month_sessions > 0
         THEN (sessions_30d - prev_month_sessions) * 1.0 / prev_month_sessions
         ELSE -1 END as session_growth_rate,

    ai_prompts_30d * 1.0 / NULLIF(sessions_30d, 0) as prompts_per_session,

    -- Risk indicators
    CASE WHEN days_since_login > 14 THEN 1 ELSE 0 END as inactive_flag,
    CASE WHEN failed_payment_count > 0 THEN 1 ELSE 0 END as payment_issue_flag,

    is_churned as churn_label
FROM UserActivity;
```

---

## 4. OSINT Data Integration Queries

### 4.1 LinkedIn Enrichment Query
```sql
-- Enrich user profiles with LinkedIn data
MERGE UserProfiles AS target
USING (
    SELECT
        u.user_id,
        l.professional_title,
        l.company_name,
        l.industry,
        l.years_experience,
        l.skills_count,
        l.connections_count,
        CASE
            WHEN l.connections_count > 500 THEN 'influencer'
            WHEN l.connections_count > 200 THEN 'connected'
            ELSE 'standard'
        END as linkedin_tier,
        l.last_updated
    FROM UserProfiles u
    INNER JOIN LinkedInData l ON u.email_hash = l.email_hash
    WHERE l.last_updated > DATEADD(day, -30, GETUTCDATE())
) AS source
ON target.user_id = source.user_id
WHEN MATCHED THEN
    UPDATE SET
        professional_title = source.professional_title,
        years_experience = source.years_experience,
        enrichment_score = CASE
            WHEN source.linkedin_tier = 'influencer' THEN 0.9
            WHEN source.linkedin_tier = 'connected' THEN 0.7
            ELSE 0.5
        END,
        updated_at = GETUTCDATE();
```

### 4.2 GitHub Activity Scoring
```sql
-- Calculate developer activity score from GitHub data
WITH GitHubScores AS (
    SELECT
        g.user_id,
        g.total_repos,
        g.total_stars,
        g.commit_count_30d,
        g.languages_count,

        -- Calculate normalized scores
        NTILE(100) OVER (ORDER BY g.total_repos) as repo_percentile,
        NTILE(100) OVER (ORDER BY g.total_stars) as star_percentile,
        NTILE(100) OVER (ORDER BY g.commit_count_30d) as activity_percentile,

        -- Composite score
        (
            NTILE(100) OVER (ORDER BY g.total_repos) * 0.2 +
            NTILE(100) OVER (ORDER BY g.total_stars) * 0.3 +
            NTILE(100) OVER (ORDER BY g.commit_count_30d) * 0.3 +
            NTILE(100) OVER (ORDER BY g.languages_count) * 0.2
        ) as developer_score

    FROM GitHubData g
    WHERE g.last_updated > DATEADD(day, -7, GETUTCDATE())
)
UPDATE UserProfiles
SET
    enrichment_score = GREATEST(enrichment_score, gs.developer_score / 100.0),
    updated_at = GETUTCDATE()
FROM UserProfiles u
INNER JOIN GitHubScores gs ON u.user_id = gs.user_id;
```

---

## 5. Privacy and Compliance Queries

### 5.1 GDPR Data Export
```sql
-- Generate complete user data export for GDPR request
DECLARE @UserId UNIQUEIDENTIFIER = '{{user_id}}';

-- User Profile
SELECT
    'UserProfile' as data_category,
    user_id,
    account_type,
    created_at,
    country_code,
    language_preference
FROM UserProfiles
WHERE user_id = @UserId;

-- AI Interactions
SELECT
    'AIInteractions' as data_category,
    interaction_id,
    prompt_timestamp,
    model_name,
    user_rating
FROM AIInteractions
WHERE user_id = @UserId;

-- Documents and References
SELECT
    'DocumentReferences' as data_category,
    reference_id,
    reference_type,
    created_at,
    times_used
FROM DocumentReferences
WHERE user_id = @UserId;

-- Subscription History
SELECT
    'Subscriptions' as data_category,
    subscription_id,
    plan_name,
    subscription_start_date,
    status
FROM Subscriptions
WHERE user_id = @UserId;
```

### 5.2 Data Retention Cleanup
```sql
-- Identify and clean up data past retention period
-- Run as scheduled job

BEGIN TRANSACTION;

-- Mark users for deletion (inactive > 2 years)
INSERT INTO DeletionQueue (user_id, reason, scheduled_date)
SELECT
    user_id,
    'inactive_retention_policy',
    GETUTCDATE()
FROM UserProfiles
WHERE last_login_at < DATEADD(year, -2, GETUTCDATE())
    AND account_type = 'free'
    AND deletion_requested_at IS NULL;

-- Archive old interactions (> 60 days per business model)
INSERT INTO ArchiveQueue (table_name, record_id, archive_date)
SELECT
    'AIInteractions',
    interaction_id,
    GETUTCDATE()
FROM AIInteractions
WHERE prompt_timestamp < DATEADD(day, -60, GETUTCDATE());

-- Delete old session data (> 30 days)
DELETE FROM DailyUserMetrics
WHERE date < DATEADD(day, -30, GETUTCDATE());

-- Log cleanup actions
INSERT INTO AuditLog (action, affected_records, timestamp)
VALUES (
    'retention_cleanup',
    @@ROWCOUNT,
    GETUTCDATE()
);

COMMIT TRANSACTION;
```

### 5.3 Anonymization for Analytics
```sql
-- Create anonymized dataset for analytics/ML
CREATE VIEW vw_AnonymizedUserActivity AS
SELECT
    HASHBYTES('SHA2_256', CAST(user_id AS VARCHAR(36))) as user_hash,

    -- Generalized demographics
    CASE
        WHEN DATEDIFF(day, created_at, GETUTCDATE()) < 30 THEN 'new'
        WHEN DATEDIFF(day, created_at, GETUTCDATE()) < 90 THEN 'recent'
        WHEN DATEDIFF(day, created_at, GETUTCDATE()) < 365 THEN 'established'
        ELSE 'veteran'
    END as user_tenure,

    -- Aggregated metrics only
    CASE
        WHEN sessions_count < 10 THEN '<10'
        WHEN sessions_count < 50 THEN '10-50'
        WHEN sessions_count < 100 THEN '50-100'
        ELSE '100+'
    END as session_bucket,

    -- K-anonymity grouping
    country_code,
    account_type,
    COUNT(*) OVER (PARTITION BY country_code, account_type) as group_size

FROM DailyUserMetrics
WHERE date >= DATEADD(day, -90, GETUTCDATE())
    AND COUNT(*) OVER (PARTITION BY country_code, account_type) >= 5; -- K=5 anonymity
```

---

## 6. Performance Monitoring Queries

### 6.1 API Performance Dashboard
```sql
-- Real-time API performance metrics
SELECT
    DATEPART(hour, timestamp) as hour,
    endpoint,
    COUNT(*) as request_count,
    AVG(latency_ms) as avg_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms) as p50_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99_latency,
    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as error_rate
FROM APILogs
WHERE timestamp >= DATEADD(hour, -24, GETUTCDATE())
GROUP BY DATEPART(hour, timestamp), endpoint
ORDER BY hour DESC, request_count DESC;
```

### 6.2 Cost Analysis by User Segment
```sql
-- Calculate infrastructure costs per user segment
WITH UserCosts AS (
    SELECT
        u.user_id,
        u.account_type,

        -- Compute costs
        SUM(ai.total_tokens) * 0.00002 as ai_cost, -- Example token pricing

        -- Storage costs
        COUNT(DISTINCT dr.reference_id) * 0.001 as storage_cost,

        -- API costs
        COUNT(DISTINCT ai.interaction_id) * 0.0001 as api_cost

    FROM UserProfiles u
    LEFT JOIN AIInteractions ai ON u.user_id = ai.user_id
    LEFT JOIN DocumentReferences dr ON u.user_id = dr.user_id
    WHERE ai.prompt_timestamp >= DATEADD(month, -1, GETUTCDATE())
    GROUP BY u.user_id, u.account_type
)
SELECT
    account_type,
    COUNT(DISTINCT user_id) as user_count,
    AVG(ai_cost + storage_cost + api_cost) as avg_total_cost,
    SUM(ai_cost) as total_ai_cost,
    SUM(storage_cost) as total_storage_cost,
    SUM(api_cost) as total_api_cost,

    -- Cost efficiency
    AVG(CASE
        WHEN account_type = 'enterprise' THEN 299.99
        WHEN account_type = 'pro' THEN 49.99
        WHEN account_type = 'trial' THEN 0
        ELSE 0
    END) - AVG(ai_cost + storage_cost + api_cost) as avg_margin

FROM UserCosts
GROUP BY account_type
ORDER BY avg_total_cost DESC;
```

---

## 7. Machine Learning Feature Queries

### 7.1 User Behavior Features
```sql
-- Extract ML features for user behavior modeling
CREATE VIEW ml_user_features AS
SELECT
    u.user_id,

    -- Temporal features
    DATEDIFF(day, u.created_at, GETUTCDATE()) as account_age,
    DATEDIFF(day, u.last_login_at, GETUTCDATE()) as days_inactive,
    DATEPART(hour, u.last_login_at) as last_login_hour,
    DATEPART(weekday, u.last_login_at) as last_login_weekday,

    -- Usage intensity
    m.sessions_last_7d,
    m.sessions_last_30d,
    m.ai_prompts_last_7d,
    m.ai_prompts_last_30d,

    -- Usage patterns
    m.avg_session_duration,
    m.avg_prompts_per_session,
    m.peak_usage_hour,
    m.weekend_usage_ratio,

    -- Quality indicators
    m.avg_ai_rating,
    m.regeneration_rate,
    m.edit_rate,

    -- Engagement trajectory
    m.sessions_last_7d - m.sessions_prev_7d as session_trend,

    -- Subscription features
    s.plan_tier,
    s.monthly_amount,
    s.failed_payment_count,
    DATEDIFF(day, s.trial_end_date, GETUTCDATE()) as days_since_trial,

    -- Target variable
    CASE WHEN m.sessions_last_7d = 0 THEN 1 ELSE 0 END as is_at_risk

FROM UserProfiles u
LEFT JOIN (
    SELECT
        user_id,
        SUM(CASE WHEN date >= DATEADD(day, -7, GETUTCDATE()) THEN sessions_count ELSE 0 END) as sessions_last_7d,
        SUM(CASE WHEN date >= DATEADD(day, -30, GETUTCDATE()) THEN sessions_count ELSE 0 END) as sessions_last_30d,
        SUM(CASE WHEN date BETWEEN DATEADD(day, -14, GETUTCDATE()) AND DATEADD(day, -8, GETUTCDATE())
            THEN sessions_count ELSE 0 END) as sessions_prev_7d,
        SUM(CASE WHEN date >= DATEADD(day, -7, GETUTCDATE()) THEN ai_prompts_count ELSE 0 END) as ai_prompts_last_7d,
        SUM(CASE WHEN date >= DATEADD(day, -30, GETUTCDATE()) THEN ai_prompts_count ELSE 0 END) as ai_prompts_last_30d,
        AVG(total_time_seconds / NULLIF(sessions_count, 0)) as avg_session_duration,
        AVG(ai_prompts_count * 1.0 / NULLIF(sessions_count, 0)) as avg_prompts_per_session,
        MODE() WITHIN GROUP (ORDER BY DATEPART(hour, date)) as peak_usage_hour,
        SUM(CASE WHEN DATEPART(weekday, date) IN (1, 7) THEN sessions_count ELSE 0 END) * 1.0 /
            NULLIF(SUM(sessions_count), 0) as weekend_usage_ratio,
        AVG(ai_average_rating) as avg_ai_rating,
        AVG(ai_regenerations * 1.0 / NULLIF(ai_prompts_count, 0)) as regeneration_rate,
        AVG(CAST(documents_edited AS FLOAT) / NULLIF(documents_created + documents_edited, 0)) as edit_rate
    FROM DailyUserMetrics
    WHERE date >= DATEADD(day, -30, GETUTCDATE())
    GROUP BY user_id
) m ON u.user_id = m.user_id
LEFT JOIN Subscriptions s ON u.user_id = s.user_id AND s.status = 'active';
```

### 7.2 Content Quality Features
```sql
-- Features for content quality prediction model
CREATE VIEW ml_content_features AS
SELECT
    dr.reference_id,
    dr.user_id,

    -- Content characteristics
    LEN(CAST(title_encrypted AS VARCHAR(MAX))) as title_length,
    LEN(CAST(authors_encrypted AS VARCHAR(MAX))) as authors_length,
    dr.year_published,
    YEAR(GETUTCDATE()) - dr.year_published as publication_age,

    -- Source features
    dr.source_type,
    CASE WHEN dr.doi IS NOT NULL THEN 1 ELSE 0 END as has_doi,
    CASE WHEN dr.isbn IS NOT NULL THEN 1 ELSE 0 END as has_isbn,
    CASE WHEN dr.source_url LIKE '%edu%' THEN 1 ELSE 0 END as is_academic,

    -- Usage patterns
    dr.times_used,
    dr.times_exported,
    dr.share_count,
    DATEDIFF(day, dr.created_at, dr.last_accessed_at) as usage_span_days,

    -- User context
    up.account_type,
    up.years_experience,

    -- Historical quality
    AVG(dr2.quality_score) OVER (PARTITION BY dr.user_id) as user_avg_quality,

    -- Target
    dr.quality_score

FROM DocumentReferences dr
INNER JOIN UserProfiles up ON dr.user_id = up.user_id
LEFT JOIN DocumentReferences dr2 ON dr.user_id = dr2.user_id AND dr2.reference_id != dr.reference_id
WHERE dr.accuracy_verified = 1; -- Only verified references for training
```

---

## 8. Data Quality Validation Queries

### 8.1 Data Completeness Check
```sql
-- Check for data quality issues
SELECT
    'UserProfiles' as table_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN email_hash IS NULL THEN 1 ELSE 0 END) as null_emails,
    SUM(CASE WHEN created_at IS NULL THEN 1 ELSE 0 END) as null_created,
    SUM(CASE WHEN account_type IS NULL THEN 1 ELSE 0 END) as null_account_type,
    SUM(CASE WHEN country_code IS NULL THEN 1 ELSE 0 END) as null_country,

    -- Calculate completeness percentage
    (1 - (
        SUM(CASE WHEN email_hash IS NULL THEN 1 ELSE 0 END) +
        SUM(CASE WHEN created_at IS NULL THEN 1 ELSE 0 END) +
        SUM(CASE WHEN account_type IS NULL THEN 1 ELSE 0 END)
    ) * 1.0 / (COUNT(*) * 3)) * 100 as completeness_percentage

FROM UserProfiles

UNION ALL

SELECT
    'AIInteractions' as table_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as null_user_id,
    SUM(CASE WHEN prompt_timestamp IS NULL THEN 1 ELSE 0 END) as null_timestamp,
    SUM(CASE WHEN model_name IS NULL THEN 1 ELSE 0 END) as null_model,
    0 as null_country,
    (1 - (
        SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) +
        SUM(CASE WHEN prompt_timestamp IS NULL THEN 1 ELSE 0 END) +
        SUM(CASE WHEN model_name IS NULL THEN 1 ELSE 0 END)
    ) * 1.0 / (COUNT(*) * 3)) * 100 as completeness_percentage
FROM AIInteractions;
```

### 8.2 Anomaly Detection
```sql
-- Detect anomalies in user activity patterns
WITH DailyActivity AS (
    SELECT
        date,
        COUNT(DISTINCT user_id) as active_users,
        SUM(sessions_count) as total_sessions,
        SUM(ai_prompts_count) as total_prompts,
        AVG(engagement_score) as avg_engagement
    FROM DailyUserMetrics
    WHERE date >= DATEADD(day, -30, GETUTCDATE())
    GROUP BY date
),
Statistics AS (
    SELECT
        AVG(active_users) as mean_users,
        STDEV(active_users) as stddev_users,
        AVG(total_sessions) as mean_sessions,
        STDEV(total_sessions) as stddev_sessions
    FROM DailyActivity
)
SELECT
    da.date,
    da.active_users,
    da.total_sessions,

    -- Calculate Z-scores
    (da.active_users - s.mean_users) / NULLIF(s.stddev_users, 0) as user_zscore,
    (da.total_sessions - s.mean_sessions) / NULLIF(s.stddev_sessions, 0) as session_zscore,

    -- Flag anomalies (|z-score| > 3)
    CASE
        WHEN ABS((da.active_users - s.mean_users) / NULLIF(s.stddev_users, 0)) > 3
        THEN 'User Anomaly'
        WHEN ABS((da.total_sessions - s.mean_sessions) / NULLIF(s.stddev_sessions, 0)) > 3
        THEN 'Session Anomaly'
        ELSE 'Normal'
    END as anomaly_status

FROM DailyActivity da
CROSS JOIN Statistics s
ORDER BY da.date DESC;
```

---

## Usage Instructions

1. **Schema Deployment**
   - Deploy schemas in order: UserProfiles → AIInteractions → DocumentReferences → Subscriptions
   - Create indexes after initial data load for better performance
   - Use partitioning for large tables (>100M rows)

2. **Query Optimization**
   - Add column store indexes for analytical queries
   - Use materialized views for frequently accessed aggregations
   - Implement query result caching for dashboards

3. **Data Ingestion**
   - Use bulk insert for batch operations
   - Implement CDC (Change Data Capture) for real-time sync
   - Use Azure Data Factory for scheduled ETL

4. **Monitoring**
   - Set up query performance insights
   - Monitor for long-running queries (>5 seconds)
   - Track storage growth and implement archival

5. **Security**
   - Enable Transparent Data Encryption (TDE)
   - Use Azure Key Vault for encryption keys
   - Implement row-level security for multi-tenant scenarios

---

This document provides production-ready schemas and queries that can be directly implemented in the AiDefRef data architecture.