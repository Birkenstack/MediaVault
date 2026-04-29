# MediaVault

MediaVault is a full-stack DBMS final project for exploring movies and TV shows through a normalized MySQL database. The application supports catalog browsing, filtering, contributor analysis, user ratings/favorites, and optional IMDb bulk-data import for larger datasets.

## Project Goals

This project was designed to satisfy the major requirements of a database systems final project:

- model real-world relationships between media, contributors, genres, and users
- enforce integrity with primary keys, foreign keys, unique constraints, and checks
- normalize the schema to 3NF
- support advanced SQL queries including joins, aggregation, views, and cross-domain analysis
- integrate MySQL with a backend API and frontend web application

## Tech Stack

- MySQL
- Node.js
- Express
- Vanilla HTML, CSS, and JavaScript

## Core Features

- browse movies and TV shows
- filter by media type, genre, title text, and score
- move through paginated catalog results with shareable URL-backed filters
- inspect detailed contributor relationships for each title
- view ratings and favorites data
- use SQL views for simplified data retrieval
- optionally import official IMDb bulk dataset files

## Project Structure

```text
db/
  schema.sql
  seed.sql
  queries.sql
  imdb_patch.sql
  imdb_staging.sql
docs/
  backend-api.md
  data-dictionary.md
  imdb-import.md
  schema-design.md
  testing.md
  demo-script.md
public/
  index.html
  styles.css
  app.js
scripts/
  import-imdb.js
src/
  config/
  controllers/
  routes/
  app.js
  server.js
```

## Database Design Summary

The schema uses a supertype/subtype structure:

- `media` stores attributes shared by all titles
- `movie` stores movie-specific attributes
- `tv_show` stores TV-specific attributes

The schema also uses bridge tables for many-to-many relationships:

- `media_genre`
- `media_contributor_credit`

This keeps the design normalized and reduces redundancy.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a local `.env` file based on `.env.example`.

Example:

```bash
cp .env.example .env
```

### 3. Create the database schema

```bash
mysql -u root -p < db/schema.sql
```

### 4. Load sample data

```bash
mysql -u root -p mediavault < db/seed.sql
```

### 5. Optional: enable IMDb import support

```bash
mysql -u root -p mediavault < db/imdb_patch.sql
```

### 6. Start the application

```bash
npm run dev
```

Then open:

- `http://localhost:3000`

## API Endpoints

- `GET /api/health`
- `GET /api/media`
- `GET /api/media/:id`
- `GET /api/genres`
- `GET /api/contributors`

More detail is available in [docs/backend-api.md](docs/backend-api.md).

## Advanced SQL Support

Example query categories included in `db/queries.sql`:

- catalog browsing via views
- filtering by genre and score
- contributor cross-domain analysis
- aggregation of ratings and favorites
- subqueries and `EXISTS`
- top-ranked titles by genre

## Documentation

- [Schema Design](docs/schema-design.md)
- [Data Dictionary](docs/data-dictionary.md)
- [Backend API](docs/backend-api.md)
- [IMDb Import](docs/imdb-import.md)
- [Testing and Validation](docs/testing.md)
- [Demo Script](docs/demo-script.md)

## Team Collaboration

To share with teammates:

1. Clone the repository
2. Run `npm install`
3. Create a local `.env`
4. Load the schema and seed files
5. Start the app with `npm run dev`

## Notes

- `.env` is intentionally not committed
- IMDb data files should remain local and should not be committed
- the project is intended for non-commercial academic use
