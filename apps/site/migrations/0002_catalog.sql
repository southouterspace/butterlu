-- Store admin drafts (docs/13). The admin Worker runs these same statements itself
-- on first use (worker/catalog-admin.ts), so nobody has to apply this by hand; the
-- file is the record of the schema.
--
-- A row holds one edited item over the live catalog: a template, a category, or the
-- shop-by lists (kind 'taxonomy', id 'all'). Discarding a change deletes its row.
CREATE TABLE IF NOT EXISTS catalog_drafts (
  kind        TEXT NOT NULL,   -- template, category, taxonomy
  id          TEXT NOT NULL,   -- template or category handle; 'all' for taxonomy
  data        TEXT NOT NULL,   -- JSON: TemplateDoc, CategoryDoc or TaxonomyDoc (src/catalog/doc.ts)
  base        TEXT,            -- JSON: the live item when the draft was started, to spot site changes under it
  updated_at  TEXT NOT NULL,   -- ISO 8601 UTC
  updated_by  TEXT,            -- the name typed at sign-in
  PRIMARY KEY (kind, id)
);

-- Who changed what, for the Changes list.
CREATE TABLE IF NOT EXISTS catalog_log (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  at       TEXT NOT NULL,
  by       TEXT,
  kind     TEXT NOT NULL,
  item_id  TEXT NOT NULL,
  action   TEXT NOT NULL,      -- save, discard, approve, draft
  detail   TEXT
);
CREATE INDEX IF NOT EXISTS catalog_log_at ON catalog_log (at DESC);

-- Every set of options Claude wrote, kept so an approved line can be traced back.
CREATE TABLE IF NOT EXISTS seo_suggestions (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  at       TEXT NOT NULL,
  by       TEXT,
  kind     TEXT NOT NULL,
  item_id  TEXT NOT NULL,
  field    TEXT NOT NULL,
  model    TEXT,
  options  TEXT NOT NULL       -- JSON array of strings
);
