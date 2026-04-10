const fs = require('fs');
const path = require('path');
const readline = require('readline');
const zlib = require('zlib');
const { pool } = require('../src/config/db');

const DATA_DIR = path.resolve(process.cwd(), process.env.IMDB_DATA_DIR || 'imdb-data');
const MIN_VOTES = Number(process.env.IMDB_MIN_VOTES || 10000);
const MAX_TITLES = Number(process.env.IMDB_MAX_TITLES || 5000);

const REQUIRED_FILES = [
  'title.basics.tsv.gz',
  'title.ratings.tsv.gz',
  'name.basics.tsv.gz',
  'title.principals.tsv.gz'
];

const ROLE_MAP = {
  actor: 'Actor',
  actress: 'Actor',
  director: 'Director',
  writer: 'Writer',
  producer: 'Producer',
  composer: 'Composer'
};

function openGzipTsv(filePath) {
  const input = fs.createReadStream(filePath).pipe(zlib.createGunzip());
  return readline.createInterface({ input, crlfDelay: Infinity });
}

function parseTsvLine(line) {
  return line.split('\t').map((value) => (value === '\\N' ? null : value));
}

function yearToDate(year) {
  if (!year) {
    return null;
  }
  return year + '-01-01';
}

function normalizeTitleType(titleType) {
  if (titleType === 'movie') {
    return 'MOVIE';
  }
  if (titleType === 'tvSeries' || titleType === 'tvMiniSeries') {
    return 'TV_SHOW';
  }
  return null;
}

function normalizeTvStatus(titleType, endYear) {
  if (titleType === 'tvMiniSeries') {
    return 'MINISERIES';
  }
  if (endYear) {
    return 'ENDED';
  }
  return 'RUNNING';
}

function parseCharacters(charactersJson) {
  if (!charactersJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(charactersJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0];
    }
  } catch (error) {
    return null;
  }

  return null;
}

function ensureFilesExist() {
  for (const filename of REQUIRED_FILES) {
    const fullPath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(fullPath)) {
      throw new Error('Missing required IMDb file: ' + fullPath);
    }
  }
}

async function loadRatings() {
  const ratingsPath = path.join(DATA_DIR, 'title.ratings.tsv.gz');
  const ratings = new Map();
  let isHeader = true;

  for await (const line of openGzipTsv(ratingsPath)) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    const [tconst, averageRating, numVotes] = parseTsvLine(line);
    const votes = Number(numVotes || 0);

    if (votes < MIN_VOTES) {
      continue;
    }

    ratings.set(tconst, {
      averageRating: averageRating ? Number(averageRating) : null,
      numVotes: votes
    });
  }

  return ratings;
}

async function loadTitles(ratingsMap) {
  const basicsPath = path.join(DATA_DIR, 'title.basics.tsv.gz');
  const titles = new Map();
  const selectedTitleIds = new Set();
  let isHeader = true;

  for await (const line of openGzipTsv(basicsPath)) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    const [
      tconst,
      titleType,
      primaryTitle,
      originalTitle,
      isAdult,
      startYear,
      endYear,
      runtimeMinutes,
      genres
    ] = parseTsvLine(line);

    const mediaType = normalizeTitleType(titleType);
    if (!mediaType) {
      continue;
    }

    if (isAdult === '1') {
      continue;
    }

    if (!startYear || !ratingsMap.has(tconst)) {
      continue;
    }

    if (selectedTitleIds.size >= MAX_TITLES) {
      break;
    }

    const ratingData = ratingsMap.get(tconst);
    const titleRecord = {
      tconst,
      mediaType,
      titleType,
      primaryTitle,
      originalTitle,
      startYear,
      endYear,
      releaseDate: yearToDate(startYear),
      runtimeMinutes: runtimeMinutes ? Number(runtimeMinutes) : null,
      genres: genres ? genres.split(',').filter(Boolean) : [],
      averageAudienceScore: ratingData.averageRating == null ? null : Number((ratingData.averageRating * 10).toFixed(1)),
      numVotes: ratingData.numVotes
    };

    titles.set(tconst, titleRecord);
    selectedTitleIds.add(tconst);
  }

  return { titles, selectedTitleIds };
}

async function loadNamesForSelectedTitles(selectedTitleIds) {
  const principalsPath = path.join(DATA_DIR, 'title.principals.tsv.gz');
  const selectedPrincipals = [];
  const selectedNameIds = new Set();
  let isHeader = true;

  for await (const line of openGzipTsv(principalsPath)) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    const [tconst, ordering, nconst, category, jobName, characters] = parseTsvLine(line);
    if (!selectedTitleIds.has(tconst)) {
      continue;
    }

    const mappedRole = ROLE_MAP[String(category || '').toLowerCase()];
    if (!mappedRole || !nconst) {
      continue;
    }

    selectedPrincipals.push({
      tconst,
      ordering: Number(ordering || 0),
      nconst,
      roleName: mappedRole,
      characterName: parseCharacters(characters),
      creditedAs: null
    });
    selectedNameIds.add(nconst);
  }

  const namesPath = path.join(DATA_DIR, 'name.basics.tsv.gz');
  const names = new Map();
  isHeader = true;

  for await (const line of openGzipTsv(namesPath)) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    const [nconst, primaryName, birthYear] = parseTsvLine(line);
    if (!selectedNameIds.has(nconst)) {
      continue;
    }

    names.set(nconst, {
      nconst,
      primaryName,
      birthDate: yearToDate(birthYear)
    });
  }

  return { selectedPrincipals, names };
}

async function ensurePatchHasRun(connection) {
  const [mediaColumns] = await connection.query(
    "SHOW COLUMNS FROM media LIKE 'imdb_title_id'"
  );
  const [contributorColumns] = await connection.query(
    "SHOW COLUMNS FROM contributors LIKE 'imdb_name_id'"
  );

  if (mediaColumns.length === 0 || contributorColumns.length === 0) {
    throw new Error('Run db/imdb_patch.sql before importing IMDb data.');
  }
}

async function upsertGenres(connection, titles) {
  const genreSet = new Set();
  for (const title of titles.values()) {
    title.genres.forEach((genre) => genreSet.add(genre.trim()));
  }

  for (const genreName of genreSet) {
    await connection.query(
      'INSERT IGNORE INTO genres (genre_name) VALUES (?)',
      [genreName]
    );
  }

  const [genreRows] = await connection.query('SELECT genre_id, genre_name FROM genres');
  return new Map(genreRows.map((row) => [row.genre_name, row.genre_id]));
}

async function loadRoleMap(connection) {
  const [rows] = await connection.query('SELECT role_id, role_name FROM contributor_roles');
  return new Map(rows.map((row) => [row.role_name, row.role_id]));
}

async function upsertTitles(connection, titles, genreMap) {
  const mediaIdMap = new Map();

  for (const title of titles.values()) {
    await connection.query(
      'INSERT INTO media (imdb_title_id, title, media_type, synopsis, release_date, original_language, age_certification, average_critic_score, average_audience_score) ' +
        'VALUES (?, ?, ?, NULL, ?, ?, NULL, NULL, ?) ' +
        'ON DUPLICATE KEY UPDATE imdb_title_id = COALESCE(imdb_title_id, VALUES(imdb_title_id)), title = VALUES(title), media_type = VALUES(media_type), release_date = VALUES(release_date), average_audience_score = VALUES(average_audience_score)',
      [title.tconst, title.primaryTitle, title.mediaType, title.releaseDate, 'Unknown', title.averageAudienceScore]
    );

    const [[mediaRow]] = await connection.query(
      'SELECT media_id FROM media WHERE imdb_title_id = ?',
      [title.tconst]
    );
    mediaIdMap.set(title.tconst, mediaRow.media_id);

    if (title.mediaType === 'MOVIE') {
      await connection.query(
        'INSERT INTO movie (media_id, runtime_minutes, box_office_usd) VALUES (?, ?, NULL) ' +
          'ON DUPLICATE KEY UPDATE runtime_minutes = VALUES(runtime_minutes)',
        [mediaRow.media_id, title.runtimeMinutes || 40]
      );
    } else {
      await connection.query(
        'INSERT INTO tv_show (media_id, total_seasons, total_episodes, end_date, current_status) VALUES (?, 1, NULL, ?, ?) ' +
          'ON DUPLICATE KEY UPDATE end_date = VALUES(end_date), current_status = VALUES(current_status)',
        [mediaRow.media_id, yearToDate(title.endYear), normalizeTvStatus(title.titleType, title.endYear)]
      );
    }

    await connection.query('DELETE FROM media_genre WHERE media_id = ?', [mediaRow.media_id]);
    for (const genreName of title.genres) {
      const genreId = genreMap.get(genreName.trim());
      if (genreId) {
        await connection.query(
          'INSERT IGNORE INTO media_genre (media_id, genre_id) VALUES (?, ?)',
          [mediaRow.media_id, genreId]
        );
      }
    }
  }

  return mediaIdMap;
}

async function upsertContributors(connection, names) {
  const contributorIdMap = new Map();

  for (const person of names.values()) {
    await connection.query(
      'INSERT INTO contributors (imdb_name_id, full_name, birth_date, country_of_origin) VALUES (?, ?, ?, NULL) ' +
        'ON DUPLICATE KEY UPDATE imdb_name_id = COALESCE(imdb_name_id, VALUES(imdb_name_id)), full_name = VALUES(full_name), birth_date = VALUES(birth_date)',
      [person.nconst, person.primaryName, person.birthDate]
    );

    const [[row]] = await connection.query(
      'SELECT contributor_id FROM contributors WHERE imdb_name_id = ?',
      [person.nconst]
    );
    contributorIdMap.set(person.nconst, row.contributor_id);
  }

  return contributorIdMap;
}

async function replaceCredits(connection, selectedPrincipals, mediaIdMap, contributorIdMap, roleIdMap) {
  const touchedMediaIds = new Set();

  for (const principal of selectedPrincipals) {
    const mediaId = mediaIdMap.get(principal.tconst);
    if (mediaId) {
      touchedMediaIds.add(mediaId);
    }
  }

  for (const mediaId of touchedMediaIds) {
    await connection.query('DELETE FROM media_contributor_credit WHERE media_id = ?', [mediaId]);
  }

  for (const principal of selectedPrincipals) {
    const mediaId = mediaIdMap.get(principal.tconst);
    const contributorId = contributorIdMap.get(principal.nconst);
    const roleId = roleIdMap.get(principal.roleName);

    if (!mediaId || !contributorId || !roleId) {
      continue;
    }

    await connection.query(
      'INSERT IGNORE INTO media_contributor_credit (media_id, contributor_id, role_id, character_name, credited_as, billing_order) VALUES (?, ?, ?, ?, ?, ?)',
      [mediaId, contributorId, roleId, principal.characterName, principal.creditedAs, principal.ordering || null]
    );
  }
}

async function run() {
  ensureFilesExist();

  const ratingsMap = await loadRatings();
  const { titles, selectedTitleIds } = await loadTitles(ratingsMap);
  const { selectedPrincipals, names } = await loadNamesForSelectedTitles(selectedTitleIds);

  const connection = await pool.getConnection();
  try {
    await ensurePatchHasRun(connection);
    await connection.beginTransaction();

    const genreMap = await upsertGenres(connection, titles);
    const roleIdMap = await loadRoleMap(connection);
    const mediaIdMap = await upsertTitles(connection, titles, genreMap);
    const contributorIdMap = await upsertContributors(connection, names);
    await replaceCredits(connection, selectedPrincipals, mediaIdMap, contributorIdMap, roleIdMap);

    await connection.commit();

    console.log('IMDb import complete.');
    console.log('Imported titles:', titles.size);
    console.log('Imported contributors:', names.size);
    console.log('Imported credits:', selectedPrincipals.length);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('IMDb import failed:', error.message);
  process.exit(1);
});
