USE mediavault;

-- table for staging IMDb title basics data for shows and movies
CREATE TABLE IF NOT EXISTS stg_imdb_title_basics (
  tconst VARCHAR(20) PRIMARY KEY,
  title_type VARCHAR(50) NULL,
  primary_title VARCHAR(500) NULL,
  original_title VARCHAR(500) NULL,
  is_adult TINYINT(1) NULL,
  start_year INT NULL,
  end_year INT NULL,
  runtime_minutes INT NULL,
  genres VARCHAR(255) NULL
) ENGINE=InnoDB;

-- table for staging IMDb title ratings data
CREATE TABLE IF NOT EXISTS stg_imdb_title_ratings (
  tconst VARCHAR(20) PRIMARY KEY,
  average_rating DECIMAL(4,2) NULL,
  num_votes INT NULL
) ENGINE=InnoDB;

-- table for staging IMDb name basics data for actors, directors, etc.
CREATE TABLE IF NOT EXISTS stg_imdb_name_basics (
  nconst VARCHAR(20) PRIMARY KEY,
  primary_name VARCHAR(255) NULL,
  birth_year INT NULL,
  death_year INT NULL,
  primary_professions VARCHAR(255) NULL,
  known_for_titles TEXT NULL
) ENGINE=InnoDB;

-- table for staging IMDb data linking titles to contributors
CREATE TABLE IF NOT EXISTS stg_imdb_title_principals (
  tconst VARCHAR(20) NOT NULL,
  ordering_no INT NOT NULL,
  nconst VARCHAR(20) NULL,
  category VARCHAR(100) NULL,
  job_name VARCHAR(255) NULL,
  characters_json TEXT NULL,
  PRIMARY KEY (tconst, ordering_no)
) ENGINE=InnoDB;
