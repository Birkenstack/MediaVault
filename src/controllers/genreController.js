const { pool } = require('../config/db');

async function listGenres(req, res) {
  const sql = [
    'SELECT',
    '  g.genre_id,',
    '  g.genre_name,',
    '  COUNT(mg.media_id) AS media_count',
    'FROM genres AS g',
    'LEFT JOIN media_genre AS mg ON mg.genre_id = g.genre_id',
    'GROUP BY g.genre_id, g.genre_name',
    'ORDER BY g.genre_name;'
  ].join('\n');

  const [rows] = await pool.query(sql);
  res.json({ data: rows });
}

module.exports = {
  listGenres
};
