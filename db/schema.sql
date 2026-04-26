-- first create the database if it doesn't already exist.
CREATE DATABASE IF NOT EXISTS mediavault
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mediavault;

-- This table holds user accounts for the app
CREATE TABLE users (
  user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_username UNIQUE (username),
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT chk_users_username_len CHECK (CHAR_LENGTH(username) BETWEEN 3 AND 50)
) ENGINE=InnoDB;

-- This is the table for storing media information
CREATE TABLE media (
  media_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  media_type ENUM('MOVIE', 'TV_SHOW') NOT NULL,
  synopsis TEXT NULL,
  release_date DATE NOT NULL,
  original_language VARCHAR(50) NOT NULL,
  age_certification VARCHAR(20) NULL,
  average_critic_score DECIMAL(4,1) NULL,
  average_audience_score DECIMAL(4,1) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_media_title_type_release UNIQUE (title, media_type, release_date),
  CONSTRAINT chk_media_release_date CHECK (release_date >= '1888-01-01'),
  CONSTRAINT chk_media_critic_score CHECK (
    average_critic_score IS NULL OR average_critic_score BETWEEN 0 AND 100
  ),
  CONSTRAINT chk_media_audience_score CHECK (
    average_audience_score IS NULL OR average_audience_score BETWEEN 0 AND 100
  )
) ENGINE=InnoDB;

-- This table holds movie-specific information, linked to the media table
CREATE TABLE movie (
  media_id BIGINT UNSIGNED PRIMARY KEY,
  runtime_minutes SMALLINT UNSIGNED NOT NULL,
  box_office_usd DECIMAL(15,2) NULL,
  CONSTRAINT fk_movie_media
    FOREIGN KEY (media_id) REFERENCES media (media_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT chk_movie_runtime CHECK (runtime_minutes BETWEEN 40 AND 600),
  CONSTRAINT chk_movie_box_office CHECK (box_office_usd IS NULL OR box_office_usd >= 0)
) ENGINE=InnoDB;

-- This table holds TV show-specific information, linked to the media table
CREATE TABLE tv_show (
  media_id BIGINT UNSIGNED PRIMARY KEY,
  total_seasons SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  total_episodes SMALLINT UNSIGNED NULL,
  end_date DATE NULL,
  current_status ENUM('RUNNING', 'ENDED', 'CANCELLED', 'MINISERIES', 'IN_PRODUCTION') NOT NULL,
  CONSTRAINT fk_tv_show_media
    FOREIGN KEY (media_id) REFERENCES media (media_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT chk_tv_show_seasons CHECK (total_seasons >= 1),
  CONSTRAINT chk_tv_show_episodes CHECK (total_episodes IS NULL OR total_episodes >= total_seasons),
  CONSTRAINT chk_tv_show_end_date CHECK (end_date IS NULL OR end_date >= '1888-01-01')
) ENGINE=InnoDB;

-- This table holds genre information
CREATE TABLE genres (
  genre_id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  genre_name VARCHAR(50) NOT NULL,
  CONSTRAINT uq_genres_name UNIQUE (genre_name)
) ENGINE=InnoDB;

-- This is a junction table to represent the many-to-many relationship between media and genres
CREATE TABLE media_genre (
  media_id BIGINT UNSIGNED NOT NULL,
  genre_id TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (media_id, genre_id),
  CONSTRAINT fk_media_genre_media
    FOREIGN KEY (media_id) REFERENCES media (media_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_media_genre_genre
    FOREIGN KEY (genre_id) REFERENCES genres (genre_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- This table holds information about contributors (actors, directors, writers, etc.)
CREATE TABLE contributors (
  contributor_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  birth_date DATE NULL,
  country_of_origin VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_contributor_identity UNIQUE (full_name, birth_date)
) ENGINE=InnoDB;

-- This table defines the different roles a contributor can have (e.g., Actor, Director, Writer)
CREATE TABLE contributor_roles (
  role_id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL,
  CONSTRAINT uq_contributor_roles_name UNIQUE (role_name)
) ENGINE=InnoDB;

-- This is a junction table to represent the many-to-many relationship between media, contributors, and their roles in that media.
CREATE TABLE media_contributor_credit (
  credit_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  media_id BIGINT UNSIGNED NOT NULL,
  contributor_id BIGINT UNSIGNED NOT NULL,
  role_id TINYINT UNSIGNED NOT NULL,
  character_name VARCHAR(150) NULL,
  credited_as VARCHAR(150) NULL,
  billing_order SMALLINT UNSIGNED NULL,
  CONSTRAINT fk_credit_media
    FOREIGN KEY (media_id) REFERENCES media (media_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_credit_contributor
    FOREIGN KEY (contributor_id) REFERENCES contributors (contributor_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_credit_role
    FOREIGN KEY (role_id) REFERENCES contributor_roles (role_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT uq_credit_assignment UNIQUE (
    media_id,
    contributor_id,
    role_id,
    character_name
  )
) ENGINE=InnoDB;

-- This table allows users to rate media and optionally leave a review.
CREATE TABLE user_rating (
  user_id BIGINT UNSIGNED NOT NULL,
  media_id BIGINT UNSIGNED NOT NULL,
  rating_value DECIMAL(3,1) NOT NULL,
  review_text TEXT NULL,
  rated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, media_id),
  CONSTRAINT fk_user_rating_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_user_rating_media
    FOREIGN KEY (media_id) REFERENCES media (media_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT chk_user_rating_value CHECK (rating_value BETWEEN 0 AND 10)
) ENGINE=InnoDB;

-- This table allows users to mark media as favorites.
CREATE TABLE user_favorite (
  user_id BIGINT UNSIGNED NOT NULL,
  media_id BIGINT UNSIGNED NOT NULL,
  favorited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, media_id),
  CONSTRAINT fk_user_favorite_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_user_favorite_media
    FOREIGN KEY (media_id) REFERENCES media (media_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Create indexes to optimize common queries
CREATE INDEX idx_media_title ON media (title);
CREATE INDEX idx_media_type_release ON media (media_type, release_date);
CREATE INDEX idx_contributors_full_name ON contributors (full_name);
CREATE INDEX idx_credit_media_role ON media_contributor_credit (media_id, role_id);
CREATE INDEX idx_credit_contributor_role ON media_contributor_credit (contributor_id, role_id);
CREATE INDEX idx_user_rating_media_value ON user_rating (media_id, rating_value);

-- Insert initial data into the contributor_roles table
INSERT IGNORE INTO contributor_roles (role_name) VALUES
  ('Actor'),
  ('Director'),
  ('Writer'),
  ('Producer'),
  ('Composer');

-- Insert initial data into the genres table
CREATE OR REPLACE VIEW vw_media_catalog AS
SELECT
  m.media_id,
  m.title,
  m.media_type,
  m.release_date,
  m.original_language,
  m.age_certification,
  m.average_critic_score,
  m.average_audience_score,
  mv.runtime_minutes,
  tv.total_seasons,
  tv.total_episodes,
  tv.current_status,
  GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') AS genres
FROM media AS m
LEFT JOIN movie AS mv
  ON mv.media_id = m.media_id
LEFT JOIN tv_show AS tv
  ON tv.media_id = m.media_id
LEFT JOIN media_genre AS mg
  ON mg.media_id = m.media_id
LEFT JOIN genres AS g
  ON g.genre_id = mg.genre_id
GROUP BY
  m.media_id,
  m.title,
  m.media_type,
  m.release_date,
  m.original_language,
  m.age_certification,
  m.average_critic_score,
  m.average_audience_score,
  mv.runtime_minutes,
  tv.total_seasons,
  tv.total_episodes,
  tv.current_status;

-- This view aggregates media information along with its genres for easier querying in the application.
CREATE OR REPLACE VIEW vw_contributor_footprint AS
SELECT
  c.contributor_id,
  c.full_name,
  r.role_name,
  COUNT(DISTINCT m.media_id) AS total_media_credits,
  SUM(CASE WHEN m.media_type = 'MOVIE' THEN 1 ELSE 0 END) AS movie_credits,
  SUM(CASE WHEN m.media_type = 'TV_SHOW' THEN 1 ELSE 0 END) AS tv_show_credits
FROM contributors AS c
JOIN media_contributor_credit AS mcc
  ON mcc.contributor_id = c.contributor_id
JOIN contributor_roles AS r
  ON r.role_id = mcc.role_id
JOIN media AS m
  ON m.media_id = mcc.media_id
GROUP BY
  c.contributor_id,
  c.full_name,
  r.role_name;
