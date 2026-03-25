USE mediavault;

-- 1. Browse the catalog with genre labels and subtype details.
SELECT *
FROM vw_media_catalog
ORDER BY release_date DESC, title;

-- 2. Filter media by genre and minimum critic score.
SELECT DISTINCT
  m.media_id,
  m.title,
  m.media_type,
  m.release_date,
  m.average_critic_score
FROM media AS m
JOIN media_genre AS mg
  ON mg.media_id = m.media_id
JOIN genres AS g
  ON g.genre_id = mg.genre_id
WHERE g.genre_name = 'Science Fiction'
  AND m.average_critic_score >= 85
ORDER BY m.average_critic_score DESC, m.title;

-- 3. Find all media for a specific contributor across movies and TV shows.
SELECT
  c.full_name,
  r.role_name,
  m.title,
  m.media_type,
  m.release_date,
  mcc.character_name
FROM media_contributor_credit AS mcc
JOIN contributors AS c
  ON c.contributor_id = mcc.contributor_id
JOIN contributor_roles AS r
  ON r.role_id = mcc.role_id
JOIN media AS m
  ON m.media_id = mcc.media_id
WHERE c.full_name = 'Matthew McConaughey'
ORDER BY m.release_date DESC;

-- 4. Contributors who have credits in both movies and TV shows.
SELECT
  c.contributor_id,
  c.full_name,
  COUNT(DISTINCT CASE WHEN m.media_type = 'MOVIE' THEN m.media_id END) AS movie_count,
  COUNT(DISTINCT CASE WHEN m.media_type = 'TV_SHOW' THEN m.media_id END) AS tv_show_count
FROM contributors AS c
JOIN media_contributor_credit AS mcc
  ON mcc.contributor_id = c.contributor_id
JOIN media AS m
  ON m.media_id = mcc.media_id
GROUP BY c.contributor_id, c.full_name
HAVING movie_count > 0 AND tv_show_count > 0
ORDER BY c.full_name;

-- 5. Average user rating and favorite count per media title.
SELECT
  m.media_id,
  m.title,
  m.media_type,
  ROUND(AVG(ur.rating_value), 2) AS avg_user_rating,
  COUNT(DISTINCT uf.user_id) AS favorite_count
FROM media AS m
LEFT JOIN user_rating AS ur
  ON ur.media_id = m.media_id
LEFT JOIN user_favorite AS uf
  ON uf.media_id = m.media_id
GROUP BY m.media_id, m.title, m.media_type
ORDER BY avg_user_rating DESC, favorite_count DESC, m.title;

-- 6. Top-rated title in each genre based on user ratings.
WITH ranked_titles AS (
  SELECT
    g.genre_name,
    m.title,
    ROUND(AVG(ur.rating_value), 2) AS avg_user_rating,
    DENSE_RANK() OVER (
      PARTITION BY g.genre_name
      ORDER BY AVG(ur.rating_value) DESC, m.title
    ) AS genre_rank
  FROM genres AS g
  JOIN media_genre AS mg
    ON mg.genre_id = g.genre_id
  JOIN media AS m
    ON m.media_id = mg.media_id
  JOIN user_rating AS ur
    ON ur.media_id = m.media_id
  GROUP BY g.genre_name, m.title
)
SELECT genre_name, title, avg_user_rating
FROM ranked_titles
WHERE genre_rank = 1
ORDER BY genre_name, title;

-- 7. Directors ranked by average critic score of their credited titles.
SELECT
  c.full_name AS director_name,
  COUNT(DISTINCT m.media_id) AS directed_titles,
  ROUND(AVG(m.average_critic_score), 2) AS avg_critic_score
FROM contributors AS c
JOIN media_contributor_credit AS mcc
  ON mcc.contributor_id = c.contributor_id
JOIN contributor_roles AS r
  ON r.role_id = mcc.role_id
JOIN media AS m
  ON m.media_id = mcc.media_id
WHERE r.role_name = 'Director'
GROUP BY c.contributor_id, c.full_name
ORDER BY avg_critic_score DESC, directed_titles DESC;

-- 8. Titles with above-average audience score within their own media type.
SELECT
  m.title,
  m.media_type,
  m.average_audience_score
FROM media AS m
WHERE m.average_audience_score > (
  SELECT AVG(m2.average_audience_score)
  FROM media AS m2
  WHERE m2.media_type = m.media_type
)
ORDER BY m.media_type, m.average_audience_score DESC;

-- 9. Users whose favorites include both a movie and a TV show.
SELECT
  u.user_id,
  u.username,
  COUNT(DISTINCT CASE WHEN m.media_type = 'MOVIE' THEN m.media_id END) AS favorite_movies,
  COUNT(DISTINCT CASE WHEN m.media_type = 'TV_SHOW' THEN m.media_id END) AS favorite_tv_shows
FROM users AS u
JOIN user_favorite AS uf
  ON uf.user_id = u.user_id
JOIN media AS m
  ON m.media_id = uf.media_id
GROUP BY u.user_id, u.username
HAVING favorite_movies > 0 AND favorite_tv_shows > 0
ORDER BY u.username;

-- 10. Cross-domain contributor summary using the analysis view.
SELECT
  full_name,
  role_name,
  total_media_credits,
  movie_credits,
  tv_show_credits
FROM vw_contributor_footprint
WHERE total_media_credits >= 1
ORDER BY total_media_credits DESC, full_name, role_name;

-- 11. Media titles with at least two credited contributors.
SELECT
  m.title,
  m.media_type,
  COUNT(*) AS total_credits
FROM media AS m
JOIN media_contributor_credit AS mcc
  ON mcc.media_id = m.media_id
GROUP BY m.media_id, m.title, m.media_type
HAVING COUNT(*) >= 2
ORDER BY total_credits DESC, m.title;

-- 12. Users who rated titles in the Action genre.
SELECT DISTINCT
  u.username,
  m.title,
  ur.rating_value
FROM users AS u
JOIN user_rating AS ur
  ON ur.user_id = u.user_id
JOIN media AS m
  ON m.media_id = ur.media_id
WHERE EXISTS (
  SELECT 1
  FROM media_genre AS mg
  JOIN genres AS g
    ON g.genre_id = mg.genre_id
  WHERE mg.media_id = m.media_id
    AND g.genre_name = 'Action'
)
ORDER BY u.username, ur.rating_value DESC;
