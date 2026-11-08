CREATE TABLE area (
  id INTEGER PRIMARY KEY,
  project_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  icon_sha TEXT,
  position INTEGER NOT NULL,
  strings INTEGER NOT NULL DEFAULT 0,
  words INTEGER NOT NULL DEFAULT 0,
  UNIQUE (project_id, slug)
);

CREATE TABLE file (
  id INTEGER PRIMARY KEY,
  project_id TEXT NOT NULL,
  area_id INTEGER NOT NULL,
  pattern TEXT NOT NULL,
  position INTEGER NOT NULL,
  UNIQUE (project_id, pattern)
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
  project_id TEXT NOT NULL,
  file_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  position INTEGER NOT NULL,
  hash INTEGER NOT NULL,
  text_hash INTEGER NOT NULL,
  open INTEGER NOT NULL,
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

CREATE TABLE translation (
  source_id INTEGER NOT NULL,
  lang TEXT NOT NULL,
  body TEXT NOT NULL,
  state INTEGER NOT NULL,
  source_hash INTEGER NOT NULL,
  flags INTEGER NOT NULL DEFAULT 0,
  by TEXT,
  credit TEXT,
  at INTEGER NOT NULL,
  PRIMARY KEY (source_id, lang)
) WITHOUT ROWID;

CREATE TABLE suggestion (
  id INTEGER PRIMARY KEY,
  source_id INTEGER NOT NULL,
  lang TEXT NOT NULL,
  body TEXT NOT NULL,
  by TEXT NOT NULL,
  at INTEGER NOT NULL
);

CREATE INDEX suggestion_string ON suggestion (source_id, lang);

CREATE TABLE progress (
  project_id TEXT NOT NULL,
  lang TEXT NOT NULL,
  area_id INTEGER NOT NULL,
  translated INTEGER NOT NULL,
  review INTEGER NOT NULL,
  approved INTEGER NOT NULL,
  problems INTEGER NOT NULL,
  suggested INTEGER NOT NULL,
  PRIMARY KEY (project_id, lang, area_id)
) WITHOUT ROWID;

CREATE TABLE tm_band (
  band INTEGER NOT NULL,
  source_id INTEGER NOT NULL,
  PRIMARY KEY (band, source_id)
) WITHOUT ROWID;

CREATE TABLE glossary (
  id INTEGER PRIMARY KEY,
  project_id TEXT NOT NULL,
  lang TEXT NOT NULL,
  term TEXT NOT NULL,
  translation TEXT,
  note TEXT,
  UNIQUE (project_id, lang, term)
);

CREATE TABLE activity (
  id INTEGER PRIMARY KEY,
  project_id TEXT NOT NULL,
  lang TEXT,
  source_id INTEGER,
  user_id TEXT,
  kind TEXT NOT NULL,
  detail TEXT,
  at INTEGER NOT NULL
);

CREATE INDEX activity_recent ON activity (project_id, id);
CREATE INDEX activity_string ON activity (source_id, lang, id);

CREATE TABLE pending (
  project_id TEXT NOT NULL,
  file_id INTEGER NOT NULL,
  lang TEXT NOT NULL,
  since INTEGER NOT NULL,
  changed INTEGER NOT NULL,
  PRIMARY KEY (project_id, file_id, lang)
) WITHOUT ROWID;

CREATE TABLE screenshot (
  id INTEGER PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  lang TEXT NOT NULL,
  commit_sha TEXT,
  at INTEGER NOT NULL,
  UNIQUE (project_id, name, lang)
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
