// TypeScript types and interfaces

export interface User {
    id: string;
    username: string;
    email: string;
    full_name: string;
    role: 'ADMIN' | 'AUDITOR' | 'RESPONSABLE';
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Audit {
    id: string;
    name: string;
    company_name: string;
    period_start: string;
    period_end: string;
    status: 'DRAFT' | 'IN_PROGRESS' | 'CLOSED';
    responsible_user_id: string;
    created_at: string;
    updated_at: string;
}

export interface SAPUser {
    id: string;
    audit_id: string;
    user_id: string;
    full_name?: string;
    user_type?: string;
    is_locked: boolean;
    last_login?: string;
    is_critical: boolean;
    created_at: string;
}

export interface SoDRule {
    id: string;
    name: string;
    description?: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    risk_base_score: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface SoDRuleDetail extends SoDRule {
    set_a_tcodes: string[];
    set_b_tcodes: string[];
}

export interface Conflict {
    id: string;
    audit_id: string;
    sap_user_id: string;
    rule_id: string;
    risk_score: number;
    detected_at: string;
    tcodes_set_a: string[];
    tcodes_set_b: string[];
    user_id?: string;
    user_name?: string;
    rule_name?: string;
    rule_severity?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Finding {
    id: string;
    audit_id: string;
    conflict_id?: string;
    title: string;
    description?: string;
    status: 'OPEN' | 'IN_REVIEW' | 'ACCEPTED' | 'REMEDIATED' | 'EXCEPTION_APPROVED' | 'CLOSED';
    assigned_to?: string;
    commitment_date?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface FindingComment {
    id: string;
    finding_id: string;
    user_id: string;
    comment_text: string;
    created_at: string;
    user_name?: string;
}

export interface EvidenceFileResponse {
    id: string;
    finding_id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    uploaded_by: string;
    uploaded_at: string;
    uploader_name?: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

export interface ImportValidationResult {
    success: boolean;
    total_rows: number;
    valid_rows: number;
    errors: Array<{ row: number; error: string }>;
    warnings?: Array<{ row: number; warning: string }>;
}

export interface ImportStatus {
    users_count: number;
    user_roles_count: number;
    role_tcodes_count: number;
}

export interface ConflictDetectionResponse {
    total_conflicts: number;
    conflicts_by_severity: {
        HIGH: number;
        MEDIUM: number;
        LOW: number;
    };
    execution_time_seconds: number;
    rules_checked?: number;
}

export interface ConflictDetectionProgress {
    audit_id: string;
    is_running: boolean;
    total_steps: number;
    processed_steps: number;
    progress_percent: number;
    current_rule?: string | null;
    current_user?: string | null;
    started_at?: string | null;
    finished_at?: string | null;
    error?: string | null;
}

export interface DashboardStats {
    total_users: number;
    active_users: number;
    total_conflicts: number;
    conflicts_by_severity: {
        HIGH: number;
        MEDIUM: number;
        LOW: number;
    };
    top_risky_users: Array<{
        user_id: string;
        user_name: string;
        risk_score: number;
        conflicts_count: number;
    }>;
    top_violated_rules: Array<{
        rule_id: string;
        rule_name: string;
        violations_count: number;
    }>;
    findings_by_status: {
        OPEN: number;
        IN_REVIEW: number;
        ACCEPTED: number;
        REMEDIATED: number;
        EXCEPTION_APPROVED: number;
        CLOSED: number;
    };
}
