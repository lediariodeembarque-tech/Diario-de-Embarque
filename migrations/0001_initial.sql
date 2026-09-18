CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY NOT NULL,
  text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 10000),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS entries_created_at_idx ON entries(created_at DESC);
