-- SQL for converting to Single-User Mode
-- This script removes the foreign key constraints to auth.users,
-- allowing you to use the app with a fixed ID defined in environment variables.

-- Disable foreign key constraints to auth.users
ALTER TABLE vault_users DROP CONSTRAINT IF EXISTS vault_users_user_id_fkey;
ALTER TABLE vault_credentials DROP CONSTRAINT IF EXISTS vault_credentials_user_id_fkey;
ALTER TABLE vault_tags DROP CONSTRAINT IF EXISTS vault_tags_user_id_fkey;
ALTER TABLE vault_audit_logs DROP CONSTRAINT IF EXISTS vault_audit_logs_user_id_fkey;

-- Note: We keep the user_id column in these tables so existing queries 
-- that filter by user_id still work. The ID used by the app is:
-- 00000000-0000-0000-0000-000000000001
