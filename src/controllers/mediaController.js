const { pool } = require('../config/db');

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function buildLikeTerm(value) {
  return '%' + value + '%';
}

const allowedSortColumns = {
  title: 'm.title',
  release_date: 'm.release_date',
  critic_score: 'm.average_critic_score',
  audience_score: 'm.average_audience_score'
};

async function listMedia(req, res) {
  const type = req.query.type;
  const genre = req.query.genre;
  const contributor = req.query.contributor;
  const search = req.query.search;
  const minCriticScore = req.query.minCriticScore;
  const minAudienceScore = req.query.minAudienceScore;
  const sortBy = req.query.sortBy || 'release_date';
  const sortOrder = req.query.sortOrder || 'desc';
  const limit = req.query.limit;
  const offset = req.query.offset;

  const whereClauses = [];
  const params = [];

  if (type) {
    whereClauses.push('m.media_type = ?');
    params.push(String(type).toUpperCase());
  }

  const genres = Array.isArray(genre) ? genre : (genre ? [genre] : []);

  if (genres.length > 0) {
    whereClauses.push(
      'g.genre_name IN (' + genres.map(() => '?').join(',') + ')'
    );
    params.push(...genres);
  }

  if (contributor) {
    whereClauses.push('c.full_name = ?');
    params.push(contributor);
  }

  if (search) {
    whereClauses.push('(m.title LIKE ? OR m.synopsis LIKE ?)');
    params.push(buildLikeTerm(search), buildLikeTerm(search));
  }

  if (minCriticScore) {
    whereClauses.push('m.average_critic_score >= ?');
    params.push(Number(minCriticScore));
  }

  if (minAudienceScore) {
    whereClauses.push('m.average_audience_score >= ?');
    params.push(Number(minAudienceScore));
  }

  const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
  const orderColumn = allowedSortColumns[sortBy] || allowedSortColumns.release_date;
  const orderDirection = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const safeLimit = parsePositiveInt(limit, 20);
  const safeOffset = parseNonNegativeInt(offset, 0);

  const sql = [
    'SELECT',
    '  m.media_id,',
    '  m.title,',
    '  m.media_type,',
    '  m.release_date,',
    '  m.original_language,',
    '  m.age_certification,',
    '  m.average_critic_score,',
    '  m.average_audience_score,',
    '  mv.runtime_minutes,',
    '  tv.total_seasons,',
    '  tv.total_episodes,',
    '  tv.current_status,',
    "  GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') AS genres",
    'FROM media AS m',
    'LEFT JOIN movie AS mv ON mv.media_id = m.media_id',
    'LEFT JOIN tv_show AS tv ON tv.media_id = m.media_id',
    'LEFT JOIN media_genre AS mg ON mg.media_id = m.media_id',
    'LEFT JOIN genres AS g ON g.genre_id = mg.genre_id',
    'LEFT JOIN media_contributor_credit AS mcc ON mcc.media_id = m.media_id',
    'LEFT JOIN contributors AS c ON c.contributor_id = mcc.contributor_id',
    whereSql,
    'GROUP BY',
    '  m.media_id,',
    '  m.title,',
    '  m.media_type,',
    '  m.release_date,',
    '  m.original_language,',
    '  m.age_certification,',
    '  m.average_critic_score,',
    '  m.average_audience_score,',
    '  mv.runtime_minutes,',
    '  tv.total_seasons,',
    '  tv.total_episodes,',
    '  tv.current_status',
  ].filter(Boolean).join('\n') +
    '\nORDER BY ' + orderColumn + ' ' + orderDirection + ', m.title ASC' +
    '\nLIMIT ? OFFSET ?;';

  const countSql = [
    'SELECT COUNT(DISTINCT m.media_id) AS total',
    'FROM media AS m',
    'LEFT JOIN media_genre AS mg ON mg.media_id = m.media_id',
    'LEFT JOIN genres AS g ON g.genre_id = mg.genre_id',
    'LEFT JOIN media_contributor_credit AS mcc ON mcc.media_id = m.media_id',
    'LEFT JOIN contributors AS c ON c.contributor_id = mcc.contributor_id',
    whereSql + ';'
  ].filter(Boolean).join('\n');

  const [[countRows], [rows]] = await Promise.all([
    pool.query(countSql, params),
    pool.query(sql, params.concat([safeLimit, safeOffset]))
  ]);
  const total = countRows[0].total;

  res.json({
    filters: {
      type: type || null,
      genre: genre || null,
      contributor: contributor || null,
      search: search || null,
      minCriticScore: minCriticScore || null,
      minAudienceScore: minAudienceScore || null
    },
    pagination: {
      total,
      limit: safeLimit,
      offset: safeOffset,
      hasMore: safeOffset + rows.length < total
    },
    data: rows
  });
}

async function getMediaById(req, res) {
  const mediaId = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(mediaId) || mediaId <= 0) {
    return res.status(400).json({ error: 'Invalid media id.' });
  }

  const mediaSql = [
    'SELECT',
    '  m.media_id,',
    '  m.title,',
    '  m.media_type,',
    '  m.synopsis,',
    '  m.release_date,',
    '  m.original_language,',
    '  m.age_certification,',
    '  m.average_critic_score,',
    '  m.average_audience_score,',
    '  mv.runtime_minutes,',
    '  mv.box_office_usd,',
    '  tv.total_seasons,',
    '  tv.total_episodes,',
    '  tv.end_date,',
    '  tv.current_status',
    'FROM media AS m',
    'LEFT JOIN movie AS mv ON mv.media_id = m.media_id',
    'LEFT JOIN tv_show AS tv ON tv.media_id = m.media_id',
    'WHERE m.media_id = ?;'
  ].join('\n');

  const [mediaRows] = await pool.query(mediaSql, [mediaId]);

  if (mediaRows.length === 0) {
    return res.status(404).json({ error: 'Media not found.' });
  }

  const [genreRows] = await pool.query(
    'SELECT g.genre_id, g.genre_name ' +
      'FROM media_genre AS mg ' +
      'JOIN genres AS g ON g.genre_id = mg.genre_id ' +
      'WHERE mg.media_id = ? ' +
      'ORDER BY g.genre_name;',
    [mediaId]
  );

  const [contributorRows] = await pool.query(
    'SELECT ' +
      'c.contributor_id, c.full_name, r.role_name, mcc.character_name, mcc.credited_as, mcc.billing_order ' +
      'FROM media_contributor_credit AS mcc ' +
      'JOIN contributors AS c ON c.contributor_id = mcc.contributor_id ' +
      'JOIN contributor_roles AS r ON r.role_id = mcc.role_id ' +
      'WHERE mcc.media_id = ? ' +
      'ORDER BY CASE WHEN mcc.billing_order IS NULL THEN 1 ELSE 0 END, mcc.billing_order, c.full_name;',
    [mediaId]
  );

  const [ratingRows] = await pool.query(
    'SELECT COUNT(*) AS total_ratings, ROUND(AVG(rating_value), 2) AS avg_user_rating ' +
      'FROM user_rating ' +
      'WHERE media_id = ?;',
    [mediaId]
  );

  return res.json({
    data: {
      ...mediaRows[0],
      genres: genreRows,
      contributors: contributorRows,
      user_summary: ratingRows[0]
    }
  });
}

module.exports = {
  listMedia,
  getMediaById
};
