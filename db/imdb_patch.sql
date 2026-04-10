USE mediavault;

ALTER TABLE media
  ADD COLUMN imdb_title_id VARCHAR(20) NULL AFTER media_id,
  ADD CONSTRAINT uq_media_imdb_title_id UNIQUE (imdb_title_id);

ALTER TABLE contributors
  ADD COLUMN imdb_name_id VARCHAR(20) NULL AFTER contributor_id,
  ADD CONSTRAINT uq_contributors_imdb_name_id UNIQUE (imdb_name_id);

CREATE INDEX idx_media_imdb_title_id ON media (imdb_title_id);
CREATE INDEX idx_contributors_imdb_name_id ON contributors (imdb_name_id);
