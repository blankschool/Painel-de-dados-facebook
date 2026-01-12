-- Add timezone column to connected_accounts
ALTER TABLE connected_accounts 
ADD COLUMN timezone TEXT DEFAULT 'America/Sao_Paulo';

-- Add comment explaining the field
COMMENT ON COLUMN connected_accounts.timezone IS 'IANA timezone identifier detected from user browser when account was connected';