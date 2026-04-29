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

function normalizeMediaType(value) {
  const s = String(value || '').toUpperCase();
  if (s === 'MOVIE' || s === 'TV_SHOW') {
    return s;
  }
  return null;
}

function parseMediaIdParam(req) {
  const mediaId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(mediaId) || mediaId <= 0) {
    return null;
  }
  return mediaId;
}

async function resolveGenreIds(connection, genreNames) {
  const ids = [];
  for (const raw of genreNames) {
    const name = String(raw || '').trim();
    if (!name) {
      continue;
    }
    await connection.query(
      'INSERT IGNORE INTO genres (genre_name) VALUES (?);',
      [name]
    );
    const [rows] = await connection.query(
      'SELECT genre_id FROM genres WHERE genre_name = ? LIMIT 1;',
      [name]
    );
    if (rows.length > 0) {
      ids.push(rows[0].genre_id);
    }
  }
  return ids;
}

async function setMediaGenres(connection, mediaId, genreNames) {
  await connection.query('DELETE FROM media_genre WHERE media_id = ?;', [mediaId]);
  if (!Array.isArray(genreNames) || genreNames.length === 0) {
    return;
  }
  const genreIds = await resolveGenreIds(connection, genreNames);
  for (const genreId of genreIds) {
    await connection.query(
      'INSERT IGNORE INTO media_genre (media_id, genre_id) VALUES (?, ?);',
      [mediaId, genreId]
    );
  }
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

async function createMedia(req, res) {
  const body = req.body || {};
  const mediaType = normalizeMediaType(body.mediaType || body.media_type);
  const title = String(body.title || '').trim();
  const releaseDate = body.releaseDate || body.release_date;
  const originalLanguage = String(body.originalLanguage || body.original_language || '').trim();

  if (!title || !mediaType || !releaseDate || !originalLanguage) {
    return res.status(400).json({
      error: 'Missing required fields: title, mediaType (MOVIE | TV_SHOW), releaseDate, originalLanguage.'
    });
  }

  const synopsis = body.synopsis != null ? String(body.synopsis) : null;
  const ageCertification =
    body.ageCertification != null || body.age_certification != null
      ? String(body.ageCertification || body.age_certification)
      : null;
  const averageCriticScore =
    body.averageCriticScore != null || body.average_critic_score != null
      ? body.averageCriticScore ?? body.average_critic_score
      : null;
  const averageAudienceScore =
    body.averageAudienceScore != null || body.average_audience_score != null
      ? body.averageAudienceScore ?? body.average_audience_score
      : null;

  const genreNames = body.genres || body.genreNames;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [mediaResult] = await connection.query(
      'INSERT INTO media (' +
        'title, media_type, synopsis, release_date, original_language, ' +
        'age_certification, average_critic_score, average_audience_score' +
        ') VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
      [
        title,
        mediaType,
        synopsis,
        releaseDate,
        originalLanguage,
        ageCertification || null,
        averageCriticScore != null && averageCriticScore !== '' ? Number(averageCriticScore) : null,
        averageAudienceScore != null && averageAudienceScore !== ''
          ? Number(averageAudienceScore)
          : null
      ]
    );

    const mediaId = mediaResult.insertId;

    if (mediaType === 'MOVIE') {
      const runtime =
        body.runtimeMinutes != null || body.runtime_minutes != null
          ? Number(body.runtimeMinutes ?? body.runtime_minutes)
          : NaN;
      if (!Number.isFinite(runtime)) {
        await connection.rollback();
        return res.status(400).json({ error: 'Movies require runtimeMinutes (40–600).' });
      }
      const boxOffice =
        body.boxOfficeUsd != null || body.box_office_usd != null
          ? body.boxOfficeUsd ?? body.box_office_usd
          : null;
      await connection.query(
        'INSERT INTO movie (media_id, runtime_minutes, box_office_usd) VALUES (?, ?, ?);',
        [mediaId, runtime, boxOffice != null && boxOffice !== '' ? Number(boxOffice) : null]
      );
    } else {
      const currentStatus = String(
        body.currentStatus || body.current_status || ''
      ).toUpperCase();
      const allowedStatus = new Set([
        'RUNNING',
        'ENDED',
        'CANCELLED',
        'MINISERIES',
        'IN_PRODUCTION'
      ]);
      if (!allowedStatus.has(currentStatus)) {
        await connection.rollback();
        return res.status(400).json({
          error:
            'TV shows require currentStatus: RUNNING | ENDED | CANCELLED | MINISERIES | IN_PRODUCTION.'
        });
      }
      const totalSeasons = parsePositiveInt(body.totalSeasons ?? body.total_seasons, 1);
      const totalEpisodes =
        body.totalEpisodes != null || body.total_episodes != null
          ? body.totalEpisodes ?? body.total_episodes
          : null;
      const endDate = body.endDate || body.end_date || null;
      await connection.query(
        'INSERT INTO tv_show (' +
          'media_id, total_seasons, total_episodes, end_date, current_status' +
          ') VALUES (?, ?, ?, ?, ?);',
        [
          mediaId,
          totalSeasons,
          totalEpisodes != null && totalEpisodes !== '' ? Number(totalEpisodes) : null,
          endDate,
          currentStatus
        ]
      );
    }

    if (Array.isArray(genreNames) && genreNames.length > 0) {
      await setMediaGenres(connection, mediaId, genreNames);
    }

    await connection.commit();
    return res.status(201).json({
      data: { media_id: mediaId }
    });
  } catch (err) {
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'A title with this type and release date already exists.'
      });
    }
    throw err;
  } finally {
    connection.release();
  }
}

async function updateMedia(req, res) {
  const mediaId = parseMediaIdParam(req);
  if (mediaId == null) {
    return res.status(400).json({ error: 'Invalid media id.' });
  }

  const body = req.body || {};
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      'SELECT media_id, media_type, title, release_date FROM media WHERE media_id = ? FOR UPDATE;',
      [mediaId]
    );
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Media not found.' });
    }

    const row = existing[0];
    const patches = [];
    const values = [];

    if (body.title != null) {
      patches.push('title = ?');
      values.push(String(body.title).trim());
    }
    if (body.synopsis !== undefined) {
      patches.push('synopsis = ?');
      values.push(body.synopsis == null ? null : String(body.synopsis));
    }
    if (body.releaseDate != null || body.release_date != null) {
      patches.push('release_date = ?');
      values.push(body.releaseDate || body.release_date);
    }
    if (body.originalLanguage != null || body.original_language != null) {
      patches.push('original_language = ?');
      values.push(String(body.originalLanguage || body.original_language).trim());
    }
    if (body.ageCertification !== undefined || body.age_certification !== undefined) {
      patches.push('age_certification = ?');
      values.push(
        body.ageCertification != null || body.age_certification != null
          ? String(body.ageCertification || body.age_certification)
          : null
      );
    }
    if (body.averageCriticScore !== undefined || body.average_critic_score !== undefined) {
      patches.push('average_critic_score = ?');
      const v = body.averageCriticScore ?? body.average_critic_score;
      values.push(v == null || v === '' ? null : Number(v));
    }
    if (body.averageAudienceScore !== undefined || body.average_audience_score !== undefined) {
      patches.push('average_audience_score = ?');
      const v = body.averageAudienceScore ?? body.average_audience_score;
      values.push(v == null || v === '' ? null : Number(v));
    }

    if (patches.length > 0) {
      values.push(mediaId);
      await connection.query(
        'UPDATE media SET ' + patches.join(', ') + ' WHERE media_id = ?;',
        values
      );
    }

    if (row.media_type === 'MOVIE') {
      const moviePatches = [];
      const movieValues = [];
      if (body.runtimeMinutes != null || body.runtime_minutes != null) {
        moviePatches.push('runtime_minutes = ?');
        movieValues.push(Number(body.runtimeMinutes ?? body.runtime_minutes));
      }
      if (body.boxOfficeUsd !== undefined || body.box_office_usd !== undefined) {
        moviePatches.push('box_office_usd = ?');
        const v = body.boxOfficeUsd ?? body.box_office_usd;
        movieValues.push(v == null || v === '' ? null : Number(v));
      }
      if (moviePatches.length > 0) {
        movieValues.push(mediaId);
        await connection.query(
          'UPDATE movie SET ' + moviePatches.join(', ') + ' WHERE media_id = ?;',
          movieValues
        );
      }
    } else {
      const tvPatches = [];
      const tvValues = [];
      if (body.totalSeasons != null || body.total_seasons != null) {
        tvPatches.push('total_seasons = ?');
        tvValues.push(Number(body.totalSeasons ?? body.total_seasons));
      }
      if (body.totalEpisodes !== undefined || body.total_episodes !== undefined) {
        tvPatches.push('total_episodes = ?');
        const v = body.totalEpisodes ?? body.total_episodes;
        tvValues.push(v == null || v === '' ? null : Number(v));
      }
      if (body.endDate !== undefined || body.end_date !== undefined) {
        tvPatches.push('end_date = ?');
        tvValues.push(body.endDate ?? body.end_date ?? null);
      }
      if (body.currentStatus != null || body.current_status != null) {
        tvPatches.push('current_status = ?');
        tvValues.push(
          String(body.currentStatus || body.current_status).toUpperCase()
        );
      }
      if (tvPatches.length > 0) {
        tvValues.push(mediaId);
        await connection.query(
          'UPDATE tv_show SET ' + tvPatches.join(', ') + ' WHERE media_id = ?;',
          tvValues
        );
      }
    }

    if (body.genres !== undefined || body.genreNames !== undefined) {
      const genreList = body.genres ?? body.genreNames;
      await setMediaGenres(connection, mediaId, Array.isArray(genreList) ? genreList : []);
    }

    await connection.commit();
    return res.json({ data: { media_id: mediaId, updated: true } });
  } catch (err) {
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'A title with this type and release date already exists.'
      });
    }
    throw err;
  } finally {
    connection.release();
  }
}

async function deleteMedia(req, res) {
  const mediaId = parseMediaIdParam(req);
  if (mediaId == null) {
    return res.status(400).json({ error: 'Invalid media id.' });
  }

  const [result] = await pool.query('DELETE FROM media WHERE media_id = ?;', [mediaId]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Media not found.' });
  }
  return res.json({ data: { media_id: mediaId, deleted: true } });
}

async function upsertRating(req, res) {
  const mediaId = parseMediaIdParam(req);
  const userId = parseUserId(req);
  if (mediaId == null) {
    return res.status(400).json({ error: 'Invalid media id.' });
  }

  const body = req.body || {};
  const ratingRaw = body.ratingValue ?? body.rating_value ?? body.rating;
  const ratingValue = Number(ratingRaw);
  if (!Number.isFinite(ratingValue) || ratingValue < 0 || ratingValue > 10) {
    return res.status(400).json({ error: 'ratingValue is required (0–10).' });
  }
  const reviewText =
    body.reviewText !== undefined || body.review_text !== undefined
      ? body.reviewText ?? body.review_text
      : null;

  const [mediaRows] = await pool.query(
    'SELECT media_id FROM media WHERE media_id = ? LIMIT 1;',
    [mediaId]
  );
  if (mediaRows.length === 0) {
    return res.status(404).json({ error: 'Media not found.' });
  }

  try {
    await pool.query(
      'INSERT INTO user_rating (user_id, media_id, rating_value, review_text) ' +
        'VALUES (?, ?, ?, ?) ' +
        'ON DUPLICATE KEY UPDATE rating_value = VALUES(rating_value), ' +
        'review_text = VALUES(review_text);',
      [userId, mediaId, ratingValue, reviewText == null ? null : String(reviewText)]
    );
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }
    throw err;
  }

  return res.status(200).json({
    data: {
      user_id: userId,
      media_id: mediaId,
      rating_value: ratingValue,
      review_text: reviewText == null ? null : String(reviewText)
    }
  });
}

async function removeRating(req, res) {
  const mediaId = parseMediaIdParam(req);
  const userId = parseUserId(req);
  if (mediaId == null) {
    return res.status(400).json({ error: 'Invalid media id.' });
  }

  const [result] = await pool.query(
    'DELETE FROM user_rating WHERE user_id = ? AND media_id = ?;',
    [userId, mediaId]
  );
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Rating not found for this user and media.' });
  }
  return res.json({
    data: { user_id: userId, media_id: mediaId, deleted: true }
  });
}

module.exports = {
  listMedia,
  getMediaById,
  listFavorites,
  addFavorite,
  removeFavorite,
  createMedia,
  updateMedia,
  deleteMedia,
  upsertRating,
  removeRating
};
