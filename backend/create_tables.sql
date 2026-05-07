-- =====================================================
-- SAP SoD Audit System - Database Schema
-- PostgreSQL / Supabase
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. APP ROLES (Internal RBAC role catalog)
-- =====================================================
CREATE TABLE IF NOT EXISTS app_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO app_roles (code, name, description)
VALUES
    ('ADMIN', 'Administrador', 'Acceso total al sistema'),
    ('AUDITOR', 'Auditor', 'Gestión de auditorías y conflictos'),
    ('RESPONSABLE', 'Responsable', 'Atención de hallazgos')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 2. APP USERS (Internal system users)
-- =====================================================
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'AUDITOR', 'RESPONSABLE')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_users_username ON app_users(username);
CREATE INDEX idx_app_users_email ON app_users(email);

-- =====================================================
-- 3. AUDITS (Audit projects)
-- =====================================================
CREATE TABLE IF NOT EXISTS audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL DEFAULT 'Consorcio Besalco Stracon',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'CLOSED')),
    responsible_user_id UUID NOT NULL REFERENCES app_users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audits_status ON audits(status);
CREATE INDEX idx_audits_responsible ON audits(responsible_user_id);

-- =====================================================
-- 4. SAP USERS (SAP user master data)
-- =====================================================
CREATE TABLE IF NOT EXISTS sap_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    user_id VARCHAR(40) NOT NULL,
    full_name VARCHAR(255),
    user_type VARCHAR(50),
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    last_login DATE,
    is_critical BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_sap_user_audit ON sap_users(audit_id, user_id);
CREATE INDEX idx_sap_users_audit ON sap_users(audit_id);

-- =====================================================
-- 5. SAP ROLES (SAP roles catalog)
-- =====================================================
CREATE TABLE IF NOT EXISTS sap_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_sap_role_audit ON sap_roles(audit_id, role_name);
CREATE INDEX idx_sap_roles_audit ON sap_roles(audit_id);

-- =====================================================
-- 6. SAP USER ROLES (User-Role assignments)
-- =====================================================
CREATE TABLE IF NOT EXISTS sap_user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    user_id VARCHAR(40) NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sap_user_roles_audit ON sap_user_roles(audit_id);
CREATE INDEX idx_sap_user_roles_user ON sap_user_roles(audit_id, user_id);
CREATE INDEX idx_sap_user_roles_role ON sap_user_roles(audit_id, role_name);

-- =====================================================
-- 7. SAP ROLE TCODES (Role-TCode assignments)
-- =====================================================
CREATE TABLE IF NOT EXISTS sap_role_tcodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    tcode VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_role_tcode_audit ON sap_role_tcodes(audit_id, role_name, tcode);
CREATE INDEX idx_sap_role_tcodes_audit ON sap_role_tcodes(audit_id);

-- =====================================================
-- 8. SOD RULES (SoD rule definitions)
-- =====================================================
CREATE TABLE IF NOT EXISTS sod_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description VARCHAR(1000),
    severity VARCHAR(10) NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('HIGH', 'MEDIUM', 'LOW')),
    risk_base_score INTEGER NOT NULL DEFAULT 50 CHECK (risk_base_score >= 0 AND risk_base_score <= 100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sod_rules_active ON sod_rules(is_active);
CREATE INDEX idx_sod_rules_severity ON sod_rules(severity);

-- =====================================================
-- 9. SOD RULE ITEMS (TCode sets for rules)
-- =====================================================
CREATE TABLE IF NOT EXISTS sod_rule_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES sod_rules(id) ON DELETE CASCADE,
    set_type VARCHAR(1) NOT NULL CHECK (set_type IN ('A', 'B')),
    tcode VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rule_set_tcode ON sod_rule_items(rule_id, set_type, tcode);

-- =====================================================
-- 10. CONFLICTS (Detected SoD violations)
-- =====================================================
CREATE TABLE IF NOT EXISTS conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    sap_user_id UUID NOT NULL REFERENCES sap_users(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES sod_rules(id) ON DELETE CASCADE,
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    tcodes_set_a JSONB NOT NULL,
    tcodes_set_b JSONB NOT NULL
);

CREATE INDEX idx_conflict_audit_user ON conflicts(audit_id, sap_user_id);
CREATE INDEX idx_conflict_audit_rule ON conflicts(audit_id, rule_id);
CREATE INDEX idx_conflicts_audit ON conflicts(audit_id);

-- =====================================================
-- 11. FINDINGS (Audit findings)
-- =====================================================
CREATE TABLE IF NOT EXISTS findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    conflict_id UUID REFERENCES conflicts(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'ACCEPTED', 'REMEDIATED', 'EXCEPTION_APPROVED', 'CLOSED')),
    assigned_to UUID REFERENCES app_users(id),
    commitment_date DATE,
    created_by UUID NOT NULL REFERENCES app_users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_finding_audit_status ON findings(audit_id, status);
CREATE INDEX idx_findings_audit ON findings(audit_id);
CREATE INDEX idx_findings_assigned ON findings(assigned_to);

-- =====================================================
-- 12. FINDING COMMENTS (Comments on findings)
-- =====================================================
CREATE TABLE IF NOT EXISTS finding_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    finding_id UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_users(id),
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_finding_comments_finding ON finding_comments(finding_id);

-- =====================================================
-- 13. EVIDENCE FILES (Evidence attachments)
-- =====================================================
CREATE TABLE IF NOT EXISTS evidence_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    finding_id UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES app_users(id),
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_files_finding ON evidence_files(finding_id);

-- =====================================================
-- 14. AUDIT LOG (System audit trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES app_users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- =====================================================
-- TRIGGERS for updated_at timestamps
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_app_users_updated_at BEFORE UPDATE ON app_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audits_updated_at BEFORE UPDATE ON audits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sod_rules_updated_at BEFORE UPDATE ON sod_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_findings_updated_at BEFORE UPDATE ON findings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMPLETED
-- =====================================================
-- All 13 tables created successfully
-- Indexes created for performance
-- Foreign keys configured with CASCADE
-- Triggers for automatic timestamp updates
-- Ready for Alembic migrations or direct use
