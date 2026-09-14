-- Add 'env' type to vault_credentials
-- This migration script drops the old check constraint and adds a new one

ALTER TABLE vault_credentials DROP CONSTRAINT vault_credentials_type_check;
ALTER TABLE vault_credentials ADD CONSTRAINT vault_credentials_type_check CHECK (type IN ('server', 'website', 'oauth', 'api', 'custom', 'env'));
