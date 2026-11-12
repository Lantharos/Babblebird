UPDATE translation SET flags = flags & ~2048 WHERE flags & 2048;

UPDATE progress SET problems = (
  SELECT count(*) FROM file f JOIN source s ON s.file_id = f.id JOIN translation t ON t.source_id = s.id
  WHERE f.area_id = progress.area_id AND t.lang = progress.lang AND t.flags != 0
);
