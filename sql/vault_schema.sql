-- Personal Credential Vault Database Schema
-- All tables prefixed with 'vault_'
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm extension for fuzzy search (must be before indexes that use it)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Extended user profile with master password hash
-- Links to Supabase auth.users via user_id
CREATE TABLE IF NOT EXISTS vault_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  master_password_hash TEXT NOT NULL,
  -- Track when master password was last verified (for auto-lock)
  master_password_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Main credentials table
CREATE TABLE IF NOT EXISTS vault_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('server', 'website', 'oauth', 'api', 'custom')),
  website_url TEXT,
  username TEXT,
  -- Encrypted secret (AES-256-GCM)
  encrypted_secret TEXT,
  auth_provider TEXT CHECK (auth_provider IN ('google', 'auth0', 'github', 'custom')),
  host TEXT,
  port INTEGER,
  environment TEXT CHECK (environment IN ('prod', 'staging', 'dev')),
  notes TEXT,
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  last_accessed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tag definitions
CREATE TABLE IF NOT EXISTS vault_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Unique tag name per user
  UNIQUE(user_id, name)
);

-- Many-to-many relationship: credentials <-> tags
CREATE TABLE IF NOT EXISTS vault_credential_tags (
  credential_id UUID NOT NULL REFERENCES vault_credentials(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES vault_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (credential_id, tag_id)
);

-- Audit log for sensitive operations
CREATE TABLE IF NOT EXISTS vault_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id UUID REFERENCES vault_credentials(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'copy', 'create', 'update', 'delete', 'restore')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- vault_users indexes
CREATE INDEX IF NOT EXISTS idx_vault_users_user_id ON vault_users(user_id);

-- vault_credentials indexes
CREATE INDEX IF NOT EXISTS idx_vault_credentials_user_id ON vault_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_credentials_type ON vault_credentials(type);
CREATE INDEX IF NOT EXISTS idx_vault_credentials_environment ON vault_credentials(environment);
CREATE INDEX IF NOT EXISTS idx_vault_credentials_favorite ON vault_credentials(favorite) WHERE favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_vault_credentials_deleted_at ON vault_credentials(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vault_credentials_last_accessed_at ON vault_credentials(last_accessed_at DESC);

-- Full-text search indexes (requires pg_trgm extension)
CREATE INDEX IF NOT EXISTS idx_vault_credentials_title_trgm ON vault_credentials USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vault_credentials_website_url_trgm ON vault_credentials USING gin(website_url gin_trgm_ops);

-- vault_tags indexes
CREATE INDEX IF NOT EXISTS idx_vault_tags_user_id ON vault_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_tags_name ON vault_tags(name);

-- vault_credential_tags indexes
CREATE INDEX IF NOT EXISTS idx_vault_credential_tags_credential_id ON vault_credential_tags(credential_id);
CREATE INDEX IF NOT EXISTS idx_vault_credential_tags_tag_id ON vault_credential_tags(tag_id);

-- vault_audit_logs indexes
CREATE INDEX IF NOT EXISTS idx_vault_audit_logs_user_id ON vault_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_audit_logs_credential_id ON vault_audit_logs(credential_id);
CREATE INDEX IF NOT EXISTS idx_vault_audit_logs_action ON vault_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_vault_audit_logs_created_at ON vault_audit_logs(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_vault_users_updated_at
  BEFORE UPDATE ON vault_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vault_credentials_updated_at
  BEFORE UPDATE ON vault_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vault_tags_updated_at
  BEFORE UPDATE ON vault_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE vault_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_credential_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own profile" ON vault_users;
DROP POLICY IF EXISTS "Users can update own profile" ON vault_users;
DROP POLICY IF EXISTS "Users can insert own profile" ON vault_users;

DROP POLICY IF EXISTS "Users can view own credentials" ON vault_credentials;
DROP POLICY IF EXISTS "Users can insert own credentials" ON vault_credentials;
DROP POLICY IF EXISTS "Users can update own credentials" ON vault_credentials;
DROP POLICY IF EXISTS "Users can delete own credentials" ON vault_credentials;

DROP POLICY IF EXISTS "Users can view own tags" ON vault_tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON vault_tags;
DROP POLICY IF EXISTS "Users can update own tags" ON vault_tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON vault_tags;

DROP POLICY IF EXISTS "Users can view own credential tags" ON vault_credential_tags;
DROP POLICY IF EXISTS "Users can insert own credential tags" ON vault_credential_tags;
DROP POLICY IF EXISTS "Users can delete own credential tags" ON vault_credential_tags;

DROP POLICY IF EXISTS "Users can view own audit logs" ON vault_audit_logs;
DROP POLICY IF EXISTS "Users can insert own audit logs" ON vault_audit_logs;

-- vault_users policies
CREATE POLICY "Users can view own profile"
  ON vault_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON vault_users FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON vault_users FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- vault_credentials policies
CREATE POLICY "Users can view own credentials"
  ON vault_credentials FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own credentials"
  ON vault_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials"
  ON vault_credentials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials"
  ON vault_credentials FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- vault_tags policies
CREATE POLICY "Users can view own tags"
  ON vault_tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags"
  ON vault_tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON vault_tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON vault_tags FOR DELETE
  USING (auth.uid() = user_id);

-- vault_credential_tags policies
-- Users can only access credential_tags for their own credentials
CREATE POLICY "Users can view own credential tags"
  ON vault_credential_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vault_credentials
      WHERE vault_credentials.id = vault_credential_tags.credential_id
      AND vault_credentials.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own credential tags"
  ON vault_credential_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vault_credentials
      WHERE vault_credentials.id = vault_credential_tags.credential_id
      AND vault_credentials.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own credential tags"
  ON vault_credential_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM vault_credentials
      WHERE vault_credentials.id = vault_credential_tags.credential_id
      AND vault_credentials.user_id = auth.uid()
    )
  );

-- vault_audit_logs policies
CREATE POLICY "Users can view own audit logs"
  ON vault_audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit logs"
  ON vault_audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's credentials count (for dashboard stats)
CREATE OR REPLACE FUNCTION vault_get_user_stats(p_user_id UUID)
RETURNS TABLE (
  total_credentials BIGINT,
  favorite_count BIGINT,
  by_type JSONB,
  by_environment JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL)::BIGINT as total_credentials,
    COUNT(*) FILTER (WHERE favorite = TRUE AND deleted_at IS NULL)::BIGINT as favorite_count,
    jsonb_object_agg(type, count) FILTER (WHERE type IS NOT NULL) as by_type,
    jsonb_object_agg(environment, count) FILTER (WHERE environment IS NOT NULL) as by_environment
  FROM (
    SELECT
      type,
      environment,
      COUNT(*) as count
    FROM vault_credentials
    WHERE user_id = p_user_id AND deleted_at IS NULL
    GROUP BY type, environment
  ) subq;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION vault_get_user_stats(UUID) TO authenticated;

