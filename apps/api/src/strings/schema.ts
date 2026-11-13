export const STRINGS_SCHEMA = [
  `CREATE TABLE area (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    icon TEXT,
    icon_sha TEXT,
    position INTEGER NOT NULL,
    strings INTEGER NOT NULL DEFAULT 0,
    words INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE file (
    id INTEGER PRIMARY KEY,
    area_id INTEGER NOT NULL,
    pattern TEXT NOT NULL UNIQUE,
    position INTEGER NOT NULL
  );

  CREATE INDEX file_area ON file (area_id, position);

  CREATE TABLE blob (
    file_id INTEGER NOT NULL,
    lang TEXT NOT NULL,
    sha TEXT NOT NULL,
    PRIMARY KEY (file_id, lang)
  ) WITHOUT ROWID;

  CREATE TABLE source (
    id INTEGER PRIMARY KEY,
    file_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    position INTEGER NOT NULL,
    hash INTEGER NOT NULL,
    text_hash INTEGER NOT NULL,
    body TEXT NOT NULL,
    plain TEXT NOT NULL,
    words INTEGER NOT NULL,
    comment TEXT,
    section TEXT,
    previous TEXT,
    UNIQUE (file_id, key)
  );

  CREATE INDEX source_order ON source (file_id, position);
  CREATE INDEX source_text ON source (text_hash);

  CREATE VIRTUAL TABLE source_search USING fts5 (key, plain, content = 'source', content_rowid = 'id', tokenize = 'trigram');

  CREATE TRIGGER source_search_added AFTER INSERT ON source
  BEGIN INSERT INTO source_search (rowid, key, plain) VALUES (NEW.id, NEW.key, NEW.plain); END;

  CREATE TRIGGER source_search_removed AFTER DELETE ON source
  BEGIN INSERT INTO source_search (source_search, rowid, key, plain) VALUES ('delete', OLD.id, OLD.key, OLD.plain); END;

  CREATE TRIGGER source_search_changed AFTER UPDATE OF key, plain ON source
  BEGIN
    INSERT INTO source_search (source_search, rowid, key, plain) VALUES ('delete', OLD.id, OLD.key, OLD.plain);
    INSERT INTO source_search (rowid, key, plain) VALUES (NEW.id, NEW.key, NEW.plain);
  END;

  CREATE TABLE credit (
    id INTEGER PRIMARY KEY,
    names TEXT NOT NULL UNIQUE
  );

  CREATE TABLE translation (
    source_id INTEGER NOT NULL,
    lang TEXT NOT NULL,
    body TEXT NOT NULL,
    base TEXT,
    unsent INTEGER NOT NULL,
    state INTEGER NOT NULL,
    source_hash INTEGER NOT NULL,
    flags INTEGER NOT NULL DEFAULT 0,
    by TEXT,
    credit_id INTEGER,
    at INTEGER NOT NULL,
    PRIMARY KEY (source_id, lang)
  ) WITHOUT ROWID;

  CREATE TABLE suggestion (
    id INTEGER PRIMARY KEY,
    source_id INTEGER NOT NULL,
    lang TEXT NOT NULL,
    body TEXT NOT NULL,
    by TEXT NOT NULL,
    at INTEGER NOT NULL,
    note TEXT
  );

  CREATE INDEX suggestion_string ON suggestion (source_id, lang);
  CREATE INDEX suggestion_by ON suggestion (by);

  CREATE TABLE progress (
    lang TEXT NOT NULL,
    area_id INTEGER NOT NULL,
    translated INTEGER NOT NULL,
    review INTEGER NOT NULL,
    approved INTEGER NOT NULL,
    problems INTEGER NOT NULL,
    suggested INTEGER NOT NULL,
    PRIMARY KEY (lang, area_id)
  ) WITHOUT ROWID;

  CREATE TABLE tm_band (
    band INTEGER NOT NULL,
    source_id INTEGER NOT NULL,
    PRIMARY KEY (band, source_id)
  ) WITHOUT ROWID;

  CREATE TABLE glossary (
    id INTEGER PRIMARY KEY,
    lang TEXT NOT NULL,
    term TEXT NOT NULL,
    translation TEXT,
    note TEXT,
    UNIQUE (lang, term)
  );

  CREATE TABLE activity (
    id INTEGER PRIMARY KEY,
    lang TEXT,
    source_id INTEGER,
    user_id TEXT,
    kind TEXT NOT NULL,
    detail TEXT,
    at INTEGER NOT NULL
  );

  CREATE INDEX activity_string ON activity (source_id, lang, id);
  CREATE INDEX activity_user ON activity (user_id, id);

  CREATE TABLE pending (
    file_id INTEGER NOT NULL,
    lang TEXT NOT NULL,
    since INTEGER NOT NULL,
    changed INTEGER NOT NULL,
    PRIMARY KEY (file_id, lang)
  ) WITHOUT ROWID;

  CREATE TABLE screenshot (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    image TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    lang TEXT NOT NULL,
    commit_sha TEXT,
    at INTEGER NOT NULL,
    UNIQUE (name, lang)
  );

  CREATE TABLE shot (
    source_id INTEGER NOT NULL,
    screenshot_id INTEGER NOT NULL,
    x INTEGER,
    y INTEGER,
    w INTEGER,
    h INTEGER,
    PRIMARY KEY (source_id, screenshot_id)
  ) WITHOUT ROWID;

  CREATE INDEX shot_screenshot ON shot (screenshot_id);

  CREATE TABLE memory_stale (lang TEXT PRIMARY KEY) WITHOUT ROWID;

  CREATE TRIGGER translation_added AFTER INSERT ON translation
  BEGIN INSERT INTO memory_stale SELECT NEW.lang WHERE NOT EXISTS (SELECT 1 FROM memory_stale WHERE lang = NEW.lang); END;

  CREATE TRIGGER translation_changed AFTER UPDATE OF body, state ON translation
  BEGIN INSERT INTO memory_stale SELECT NEW.lang WHERE NOT EXISTS (SELECT 1 FROM memory_stale WHERE lang = NEW.lang); END;

  CREATE TRIGGER translation_removed AFTER DELETE ON translation
  BEGIN INSERT INTO memory_stale SELECT OLD.lang WHERE NOT EXISTS (SELECT 1 FROM memory_stale WHERE lang = OLD.lang); END;

  CREATE TRIGGER source_changed AFTER UPDATE OF plain ON source
  BEGIN
    INSERT INTO memory_stale SELECT DISTINCT lang FROM translation
    WHERE source_id = NEW.id AND lang NOT IN (SELECT lang FROM memory_stale);
  END;`,
  `ALTER TABLE glossary ADD COLUMN unsent INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE glossary ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE glossary ADD COLUMN in_repo INTEGER NOT NULL DEFAULT 1;`,
]
