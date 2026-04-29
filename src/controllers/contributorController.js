const { pool } = require('../config/db');

function buildLikeTerm(value) {
  return '%' + value + '%';
}

async function listContributors(req, res) {
  const role = req.query.role;
  const search = req.query.search;
  const whereClauses = [];
  const params = [];

  if (role) {
    whereClauses.push('r.role_name = ?');
    params.push(role);
  }

  if (search) {
    whereClauses.push('c.full_name LIKE ?');
    params.push(buildLikeTerm(search));
  }

  const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
  const sql = [
    'SELECT',
    '  c.contributor_id,',
    '  c.full_name,',
    '  c.birth_date,',
    '  c.country_of_origin,',
    '  r.role_name,',
    '  COUNT(DISTINCT mcc.media_id) AS total_media_credits',
    'FROM contributors AS c',
    'JOIN media_contributor_credit AS mcc ON mcc.contributor_id = c.contributor_id',
    'JOIN contributor_roles AS r ON r.role_id = mcc.role_id',
    whereSql,
    'GROUP BY',
    '  c.contributor_id,',
    '  c.full_name,',
    '  c.birth_date,',
    '  c.country_of_origin,',
    '  r.role_name',
    'ORDER BY total_media_credits DESC, c.full_name ASC;'
  ].filter(Boolean).join('\n');

  const [rows] = await pool.query(sql, params);

  res.json({
    filters: {
      role: role || null,
      search: search || null
    },
    data: rows
  });
}

async function getContributorById(req, res) {
  const contributorId = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(contributorId) || contributorId <= 0) {
    return res.status(400).json({ error: 'Invalid contributor id.' });
  }

  const [contributorRows] = await pool.query(
    [
      'SELECT',
      '  c.contributor_id,',
      '  c.full_name,',
      '  c.birth_date,',
      '  c.country_of_origin,',
      '  COUNT(DISTINCT mcc.media_id) AS total_media_credits',
      'FROM contributors AS c',
      'LEFT JOIN media_contributor_credit AS mcc ON mcc.contributor_id = c.contributor_id',
      'WHERE c.contributor_id = ?',
      'GROUP BY c.contributor_id, c.full_name, c.birth_date, c.country_of_origin;'
    ].join('\n'),
    [contributorId]
  );

  if (contributorRows.length === 0) {
    return res.status(404).json({ error: 'Contributor not found.' });
  }

  const [roleRows] = await pool.query(
    [
      'SELECT',
      '  r.role_name,',
      '  COUNT(DISTINCT mcc.media_id) AS title_count',
      'FROM media_contributor_credit AS mcc',
      'JOIN contributor_roles AS r ON r.role_id = mcc.role_id',
      'WHERE mcc.contributor_id = ?',
      'GROUP BY r.role_name',
      'ORDER BY title_count DESC, r.role_name ASC;'
    ].join('\n'),
    [contributorId]
  );

  const [creditRows] = await pool.query(
    [
      'SELECT',
      '  m.media_id,',
      '  m.title,',
      '  m.media_type,',
      '  m.release_date,',
      '  r.role_name,',
      '  mcc.character_name,',
      '  mcc.billing_order',
      'FROM media_contributor_credit AS mcc',
      'JOIN media AS m ON m.media_id = mcc.media_id',
      'JOIN contributor_roles AS r ON r.role_id = mcc.role_id',
      'WHERE mcc.contributor_id = ?',
      'ORDER BY m.release_date DESC, m.title ASC, r.role_name ASC;'
    ].join('\n'),
    [contributorId]
  );

  return res.json({
    data: {
      ...contributorRows[0],
      roles: roleRows,
      credits: creditRows
    }
  });
}

module.exports = {
  listContributors,
  getContributorById
};
