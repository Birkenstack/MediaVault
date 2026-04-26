USE mediavault;

-- Clear existing data while respecting foreign key constraints
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE user_favorite;
TRUNCATE TABLE user_rating;
TRUNCATE TABLE media_contributor_credit;
TRUNCATE TABLE media_genre;
TRUNCATE TABLE movie;
TRUNCATE TABLE tv_show;
TRUNCATE TABLE users;
TRUNCATE TABLE contributors;
TRUNCATE TABLE contributor_roles;
TRUNCATE TABLE genres;
TRUNCATE TABLE media;
SET FOREIGN_KEY_CHECKS = 1;

-- Seed contributor roles
INSERT INTO contributor_roles (role_name) VALUES
  ('Actor'),
  ('Director'),
  ('Writer'),
  ('Producer'),
  ('Composer');

-- Seed genres
INSERT INTO genres (genre_name) VALUES
  ('Action'),
  ('Drama'),
  ('Science Fiction'),
  ('Thriller'),
  ('Comedy'),
  ('Fantasy'),
  ('Crime'),
  ('Adventure'),
  ('Horror'),
  ('Romance');

-- Seed users
INSERT INTO users (username, email, display_name) VALUES
  ('alex01', 'alex@example.com', 'Alex Carter'),
  ('mia02', 'mia@example.com', 'Mia Lopez'),
  ('noah03', 'noah@example.com', 'Noah Patel'),
  ('zoe04', 'zoe@example.com', 'Zoe Kim');

-- Seed contributors
INSERT INTO contributors (full_name, birth_date, country_of_origin) VALUES
  ('Christopher Nolan', '1970-07-30', 'United Kingdom'),
  ('Denis Villeneuve', '1967-10-03', 'Canada'),
  ('Greta Gerwig', '1983-08-04', 'United States'),
  ('Pedro Pascal', '1975-04-02', 'Chile'),
  ('Zendaya', '1996-09-01', 'United States'),
  ('Florence Pugh', '1996-01-03', 'United Kingdom'),
  ('Cillian Murphy', '1976-05-25', 'Ireland'),
  ('Anya Taylor-Joy', '1996-04-16', 'United States'),
  ('Matthew McConaughey', '1969-11-04', 'United States'),
  ('Emma Stone', '1988-11-06', 'United States'),
  ('Craig Mazin', '1971-04-08', 'United States'),
  ('Bella Ramsey', '2003-09-30', 'United Kingdom');

-- Seed media, movies, TV shows, genres, contributor credits, user ratings, and favorites
INSERT INTO media (
  title,
  media_type,
  synopsis,
  release_date,
  original_language,
  age_certification,
  average_critic_score,
  average_audience_score
) VALUES
  ('Inception', 'MOVIE', 'A skilled thief enters layered dreams to plant an idea.', '2010-07-16', 'English', 'PG-13', 91.0, 92.0),
  ('Interstellar', 'MOVIE', 'Astronauts travel through a wormhole to secure humanity''s future.', '2014-11-07', 'English', 'PG-13', 88.0, 91.0),
  ('Dune', 'MOVIE', 'A young nobleman faces political conflict on a desert planet.', '2021-10-22', 'English', 'PG-13', 83.0, 90.0),
  ('Oppenheimer', 'MOVIE', 'The life and moral struggle of J. Robert Oppenheimer.', '2023-07-21', 'English', 'R', 93.0, 91.0),
  ('Barbie', 'MOVIE', 'Barbie leaves her idealized world and confronts reality.', '2023-07-21', 'English', 'PG-13', 88.0, 84.0),
  ('The Last of Us', 'TV_SHOW', 'Survivors navigate a fungal apocalypse across the United States.', '2023-01-15', 'English', 'TV-MA', 96.0, 89.0),
  ('The Queen''s Gambit', 'TV_SHOW', 'A gifted chess prodigy rises while battling addiction and isolation.', '2020-10-23', 'English', 'TV-MA', 94.0, 92.0),
  ('True Detective', 'TV_SHOW', 'Detectives investigate layered crimes across different timelines.', '2014-01-12', 'English', 'TV-MA', 90.0, 86.0),
  ('Wednesday', 'TV_SHOW', 'Wednesday Addams investigates mysteries at Nevermore Academy.', '2022-11-23', 'English', 'TV-14', 72.0, 81.0),
  ('The Bear', 'TV_SHOW', 'A chef returns home to rebuild a chaotic family restaurant.', '2022-06-23', 'English', 'TV-MA', 95.0, 88.0);

-- The media_id values in the following inserts correspond to the auto-incremented IDs of the media entries above.
INSERT INTO movie (media_id, runtime_minutes, box_office_usd) VALUES
  (1, 148, 839000000.00),
  (2, 169, 701000000.00),
  (3, 155, 402000000.00),
  (4, 180, 976000000.00),
  (5, 114, 1445000000.00);

-- The media_id values in the following inserts correspond to the auto-incremented IDs of the media entries above.
INSERT INTO tv_show (media_id, total_seasons, total_episodes, end_date, current_status) VALUES
  (6, 2, 16, NULL, 'RUNNING'),
  (7, 1, 7, '2020-10-23', 'MINISERIES'),
  (8, 4, 30, NULL, 'RUNNING'),
  (9, 1, 8, NULL, 'RUNNING'),
  (10, 3, 28, NULL, 'RUNNING');

-- The media_id and genre_id values in the following inserts correspond to the auto-incremented IDs of the media and genres entries above.
INSERT INTO media_genre (media_id, genre_id) VALUES
  (1, 1), (1, 3), (1, 4), (1, 9),
  (2, 2), (2, 3), (2, 8),
  (3, 1), (3, 3), (3, 8),
  (4, 2), (4, 4),
  (5, 5), (5, 6), (5, 8), (5, 10),
  (6, 1), (6, 2),
  (7, 2),
  (8, 2), (8, 4), (8, 7),
  (9, 5), (9, 6),
  (10, 2), (10, 5);


-- The media_id, contributor_id, and role_id values in the following inserts correspond to the auto-incremented IDs of the media, contributors, and contributor_roles entries above.
INSERT INTO media_contributor_credit (
  media_id,
  contributor_id,
  role_id,
  character_name,
  credited_as,
  billing_order
) VALUES
  (1, 1, 2, NULL, 'Christopher Nolan', 1),
  (1, 1, 3, NULL, 'Christopher Nolan', 2),
  (2, 1, 2, NULL, 'Christopher Nolan', 1),
  (2, 9, 1, 'Cooper', 'Matthew McConaughey', 1),
  (3, 2, 2, NULL, 'Denis Villeneuve', 1),
  (3, 5, 1, 'Chani', 'Zendaya', 2),
  (4, 1, 2, NULL, 'Christopher Nolan', 1),
  (4, 7, 1, 'J. Robert Oppenheimer', 'Cillian Murphy', 1),
  (4, 6, 1, 'Jean Tatlock', 'Florence Pugh', 3),
  (5, 3, 2, NULL, 'Greta Gerwig', 1),
  (5, 3, 3, NULL, 'Greta Gerwig', 2),
  (5, 10, 1, 'Barbie', 'Emma Stone', 1),
  (6, 11, 2, NULL, 'Craig Mazin', 1),
  (6, 11, 3, NULL, 'Craig Mazin', 2),
  (6, 4, 1, 'Joel Miller', 'Pedro Pascal', 1),
  (6, 12, 1, 'Ellie Williams', 'Bella Ramsey', 2),
  (7, 8, 1, 'Beth Harmon', 'Anya Taylor-Joy', 1),
  (8, 9, 1, 'Rust Cohle', 'Matthew McConaughey', 1),
  (9, 8, 1, NULL, 'Anya Taylor-Joy', 3),
  (10, 6, 1, NULL, 'Florence Pugh', 4);


-- The user_id and media_id values in the following inserts correspond to the auto-incremented IDs of the users and media entries above.
INSERT INTO user_rating (user_id, media_id, rating_value, review_text, rated_at) VALUES
  (1, 1, 9.5, 'Inventive and rewarding on rewatch.', '2026-03-10 19:15:00'),
  (1, 3, 8.8, 'Huge scale and strong world building.', '2026-03-12 20:10:00'),
  (1, 6, 9.2, 'Excellent adaptation with strong performances.', '2026-03-18 21:05:00'),
  (2, 2, 9.0, 'Ambitious and emotional science fiction.', '2026-03-11 18:40:00'),
  (2, 5, 8.3, 'Funny and visually sharp.', '2026-03-13 20:55:00'),
  (2, 7, 9.4, 'Focused storytelling and a great lead performance.', '2026-03-17 22:00:00'),
  (3, 4, 9.6, 'Dense but gripping from start to finish.', '2026-03-14 19:25:00'),
  (3, 6, 9.0, 'Strong chemistry and high tension.', '2026-03-19 20:45:00'),
  (3, 8, 8.7, 'Dark, atmospheric crime drama.', '2026-03-20 21:35:00'),
  (4, 1, 9.1, 'Clever structure and memorable visuals.', '2026-03-09 18:20:00'),
  (4, 7, 9.3, 'One of the strongest limited series I have seen.', '2026-03-16 22:15:00'),
  (4, 10, 8.9, 'Fast, tense, and character-driven.', '2026-03-21 19:50:00');


-- The user_id and media_id values in the following inserts correspond to the auto-incremented IDs of the users and media entries above.
INSERT INTO user_favorite (user_id, media_id, favorited_at) VALUES
  (1, 1, '2026-03-10 19:20:00'),
  (1, 6, '2026-03-18 21:10:00'),
  (2, 2, '2026-03-11 18:45:00'),
  (2, 7, '2026-03-17 22:05:00'),
  (3, 4, '2026-03-14 19:30:00'),
  (3, 8, '2026-03-20 21:40:00'),
  (4, 1, '2026-03-09 18:25:00'),
  (4, 10, '2026-03-21 19:55:00');
