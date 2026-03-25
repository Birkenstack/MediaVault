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

module.exports = {
  listContributors
};
