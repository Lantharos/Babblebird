ALTER TABLE translation ADD COLUMN base TEXT;
UPDATE translation SET base = body WHERE by IS NULL;
ALTER TABLE suggestion ADD COLUMN note TEXT;
