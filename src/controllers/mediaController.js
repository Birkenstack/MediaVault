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

function parseUserId(req) {
  return parsePositiveInt(req.query.userId || (req.body && req.body.userId), 1);
}

function buildMediaFilters(query) {
  const type = query.type;
  const genre = query.genre;
  const contributor = query.contributor;
  const search = query.search;
  const minCriticScore = query.minCriticScore;
  const minAudienceScore = query.minAudienceScore;
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

  return {
    whereSql: whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '',
    params,
    filters: {
      type: type || null,
      genre: genre || null,
      contributor: contributor || null,
      search: search || null,
      minCriticScore: minCriticScore || null,
      minAudienceScore: minAudienceScore || null
    }
  };
}

async function listMedia(req, res) {
  const sortBy = req.query.sortBy || 'release_date';
  const sortOrder = req.query.sortOrder || 'desc';
  const limit = req.query.limit;
  const offset = req.query.offset;
  const page = req.query.page;
  const safePage = parsePositiveInt(page, 1);
  const userId = parseUserId(req);
  const filterData = buildMediaFilters(req.query);
  const whereSql = filterData.whereSql;
  const params = filterData.params;
  const orderColumn = allowedSortColumns[sortBy] || allowedSortColumns.release_date;
  const orderDirection = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const safeLimit = parsePositiveInt(limit, 20);
  const safeOffset = parseNonNegativeInt(offset, (safePage - 1) * safeLimit);

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
    '  MAX(CASE WHEN uf.user_id IS NULL THEN 0 ELSE 1 END) AS is_favorited,',
    "  GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') AS genres",
    'FROM media AS m',
    'LEFT JOIN movie AS mv ON mv.media_id = m.media_id',
    'LEFT JOIN tv_show AS tv ON tv.media_id = m.media_id',
    'LEFT JOIN media_genre AS mg ON mg.media_id = m.media_id',
    'LEFT JOIN genres AS g ON g.genre_id = mg.genre_id',
    'LEFT JOIN media_contributor_credit AS mcc ON mcc.media_id = m.media_id',
    'LEFT JOIN contributors AS c ON c.contributor_id = mcc.contributor_id',
    'LEFT JOIN user_favorite AS uf ON uf.media_id = m.media_id AND uf.user_id = ?',
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
    whereSql
  ].filter(Boolean).join('\n') + ';';

  const [[countRow], [rows]] = await Promise.all([
    pool.query(countSql, params),
    pool.query(sql, [userId].concat(params, [safeLimit, safeOffset]))
  ]);
  const total = Number(countRow.total || 0);
  const currentPage = Math.floor(safeOffset / safeLimit) + 1;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  res.json({
    filters: filterData.filters,
    pagination: {
      limit: safeLimit,
      offset: safeOffset,
      page: currentPage,
      total,
      totalPages,
      hasNextPage: totalPages > 0 && currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    },
    data: rows
  });
}

async function getMediaById(req, res) {
  const mediaId = Number.parseInt(req.params.id, 10);
  const userId = parseUserId(req);

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
    '  CASE WHEN uf.user_id IS NULL THEN 0 ELSE 1 END AS is_favorited,',
    '  mv.runtime_minutes,',
    '  mv.box_office_usd,',
    '  tv.total_seasons,',
    '  tv.total_episodes,',
    '  tv.end_date,',
    '  tv.current_status',
    'FROM media AS m',
    'LEFT JOIN movie AS mv ON mv.media_id = m.media_id',
    'LEFT JOIN tv_show AS tv ON tv.media_id = m.media_id',
    'LEFT JOIN user_favorite AS uf ON uf.media_id = m.media_id AND uf.user_id = ?',
    'WHERE m.media_id = ?;'
  ].join('\n');

  const [mediaRows] = await pool.query(mediaSql, [userId, mediaId]);

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

async function listFavorites(req, res) {
  const userId = parseUserId(req);
  const [rows] = await pool.query(
    'SELECT ' +
      'm.media_id, m.title, m.media_type, m.release_date, m.average_critic_score, m.average_audience_score, uf.favorited_at ' +
      'FROM user_favorite AS uf ' +
      'JOIN media AS m ON m.media_id = uf.media_id ' +
      'WHERE uf.user_id = ? ' +
      'ORDER BY uf.favorited_at DESC, m.title ASC;',
    [userId]
  );

  return res.json({
    data: rows
  });
}

async function addFavorite(req, res) {
  const mediaId = Number.parseInt(req.params.id, 10);
  const userId = parseUserId(req);

  if (!Number.isInteger(mediaId) || mediaId <= 0) {
    return res.status(400).json({ error: 'Invalid media id.' });
  }

  await pool.query(
    'INSERT IGNORE INTO user_favorite (user_id, media_id) VALUES (?, ?);',
    [userId, mediaId]
  );

  return res.status(201).json({
    data: {
      user_id: userId,
      media_id: mediaId,
      is_favorited: true
    }
  });
}

async function removeFavorite(req, res) {
  const mediaId = Number.parseInt(req.params.id, 10);
  const userId = parseUserId(req);

  if (!Number.isInteger(mediaId) || mediaId <= 0) {
    return res.status(400).json({ error: 'Invalid media id.' });
  }

  await pool.query(
    'DELETE FROM user_favorite WHERE user_id = ? AND media_id = ?;',
    [userId, mediaId]
  );

  return res.json({
    data: {
      user_id: userId,
      media_id: mediaId,
      is_favorited: false
    }
  });
}

module.exports = {
  listMedia,
  getMediaById,
  listFavorites,
  addFavorite,
  removeFavorite
};
