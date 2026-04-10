# IMDb Import Workflow

## Important Usage Note

For a class project, use only the official IMDb bulk datasets and do not scrape the IMDb website.

Relevant IMDb pages:
- https://www.imdb.com/interfaces
- https://help.imdb.com/article/imdb/general-information/can-i-use-imdb-data-in-my-software/G5JTRESSHJBBHTGX

Practical rule: keep this import workflow for local, non-commercial, class-project use unless your instructor explicitly approves broader sharing.

## What This Adds

This workflow adds:
- stable IMDb ID columns in `media` and `contributors`
- optional staging tables for raw IMDb TSV ingestion
- a Node import script for official IMDb bulk files

## Files Used

Download these files from the official IMDb datasets and place them in `imdb-data/`:
- `title.basics.tsv.gz`
- `title.ratings.tsv.gz`
- `name.basics.tsv.gz`
- `title.principals.tsv.gz`

## Recommended Run Order

1. Run `db/schema.sql`
2. Run `db/imdb_patch.sql`
3. Install dependencies with `npm install`
4. Download the IMDb files into `imdb-data/`
5. Run the importer:

```bash
npm run import:imdb
```

## Optional Environment Variables

You can tune the importer with:

```bash
IMDB_DATA_DIR=./imdb-data
IMDB_MIN_VOTES=5000
IMDB_MAX_TITLES=3000
```

Defaults:
- `IMDB_DATA_DIR=./imdb-data`
- `IMDB_MIN_VOTES=10000`
- `IMDB_MAX_TITLES=5000`

## Import Scope

The importer intentionally keeps the project manageable:
- imports only `movie`, `tvSeries`, and `tvMiniSeries`
- excludes adult titles
- excludes episode-level imports
- maps IMDb rating data into `average_audience_score` on a 0 to 100 scale
- leaves `average_critic_score` as `NULL`
- stores TV status as `RUNNING`, `ENDED`, or `MINISERIES`

## Field Mapping Summary

### `media`
- `imdb_title_id` <- `tconst`
- `title` <- `primaryTitle`
- `media_type` <- IMDb title type mapping
- `release_date` <- `startYear-01-01`
- `average_audience_score` <- `averageRating * 10`

### `movie`
- `runtime_minutes` <- `runtimeMinutes`

### `tv_show`
- `current_status` <- derived from type and `endYear`
- `total_seasons` <- default `1`

### `contributors`
- `imdb_name_id` <- `nconst`
- `full_name` <- `primaryName`
- `birth_date` <- `birthYear-01-01` when available

### `media_contributor_credit`
- `billing_order` <- `ordering`
- role mapping:
  - `actor`, `actress` -> `Actor`
  - `director` -> `Director`
  - `writer` -> `Writer`
  - `producer` -> `Producer`
  - `composer` -> `Composer`

## Notes

- The importer uses upserts so you can rerun it after downloading fresher IMDb files.
- IMDb uses `\N` for null values in TSV files.
- Keep the downloaded `.tsv.gz` files out of git.
