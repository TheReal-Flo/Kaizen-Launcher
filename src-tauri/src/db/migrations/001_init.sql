-- Comptes Microsoft
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    uuid TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    skin_url TEXT,
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active);

-- Instances
CREATE TABLE IF NOT EXISTS instances (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon_path TEXT,
    mc_version TEXT NOT NULL,
    loader TEXT,
    loader_version TEXT,
    java_path TEXT,
    memory_min_mb INTEGER DEFAULT 1024,
    memory_max_mb INTEGER DEFAULT 4096,
    jvm_args TEXT DEFAULT '[]',
    game_dir TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    last_played TEXT,
    total_playtime_seconds INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_instances_last_played ON instances(last_played DESC);

-- Mods par instance
CREATE TABLE IF NOT EXISTS instance_mods (
    id TEXT PRIMARY KEY,
    instance_id TEXT NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    source_id TEXT,
    version_id TEXT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_instance_mods_instance ON instance_mods(instance_id);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
    ('theme', '"system"'),
    ('language', '"fr"'),
    ('default_memory_min', '1024'),
    ('default_memory_max', '4096'),
    ('max_concurrent_downloads', '5'),
    ('show_snapshots', 'false'),
    ('check_updates', 'true');
