-- Add server mode support to instances
ALTER TABLE instances ADD COLUMN is_server INTEGER DEFAULT 0;
ALTER TABLE instances ADD COLUMN is_proxy INTEGER DEFAULT 0;
ALTER TABLE instances ADD COLUMN server_port INTEGER DEFAULT 25565;

-- Make mc_version optional for proxies (we can't change NOT NULL in SQLite, but we handle this in code)
