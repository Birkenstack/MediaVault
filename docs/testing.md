# Testing And Validation

This document summarizes the testing completed for MediaVault across the database layer, backend API, and frontend application.

## Testing Goals

The purpose of testing was to confirm:

- schema constraints are enforced correctly
- relational integrity is preserved
- backend endpoints return expected data
- frontend interactions correctly display database-backed content

## 1. Database Validation

### Schema Creation

Test:
- executed `db/schema.sql`

Expected result:
- database objects were created successfully
- all required entity, subtype, and bridge tables were available

Observed result:
- schema loaded successfully in MySQL

### Seed Data Load

Test:
- executed `db/seed.sql`

Expected result:
- sample users, media, genres, contributors, ratings, and favorites inserted without foreign-key violations

Observed result:
- seed data loaded successfully and populated the application

### Constraint Validation Cases

#### Case 1: duplicate username

Test:
- attempt to insert a second user with an existing username

Expected result:
- rejected by unique constraint on `users.username`

#### Case 2: invalid rating value

Test:
- attempt to insert a rating greater than 10 into `user_rating`

Expected result:
- rejected by `chk_user_rating_value`

#### Case 3: orphan favorite

Test:
- attempt to insert a favorite referencing a nonexistent `media_id`

Expected result:
- rejected by foreign key on `user_favorite.media_id`

#### Case 4: duplicate media-genre assignment

Test:
- attempt to insert the same `(media_id, genre_id)` pair twice into `media_genre`

Expected result:
- rejected by the composite primary key

#### Case 5: invalid movie runtime

Test:
- attempt to insert a movie with `runtime_minutes` outside the permitted range

Expected result:
- rejected by `chk_movie_runtime`

## 2. Query Validation

Tested query categories from `db/queries.sql`:

- joins across media, genres, and contributors
- aggregation of ratings and favorites
- subqueries for above-average filtering
- `EXISTS` queries for genre-based user activity
- cross-domain contributor analysis
- view-based catalog retrieval

Expected result:
- all query outputs should return meaningful rows using the seeded data

Observed result:
- query set is aligned with the schema and project goals and supports demo-ready analytics

## 3. Backend API Validation

### Endpoint: `GET /api/health`

Expected result:
- returns a healthy service response

Observed result:
- route is available and returns a running status message

### Endpoint: `GET /api/media`

Expected result:
- returns catalog records with optional filters and pagination

Observed result:
- successfully powers the frontend media grid

### Endpoint: `GET /api/media/:id`

Expected result:
- returns a single title with subtype data, genres, contributors, and rating summary

Observed result:
- successfully powers the detail panel in the frontend

### Endpoint: `GET /api/genres`

Expected result:
- returns genres and associated media counts

Observed result:
- successfully populates the genre filter dropdown

### Endpoint: `GET /api/contributors`

Expected result:
- returns contributor summaries for display and filtering

Observed result:
- successfully powers the contributor panel

## 4. Frontend Validation

### UI Load Test

Test:
- opened `http://localhost:3000`

Expected result:
- frontend should load, request API data, and render the media catalog

Observed result:
- page loaded successfully and displayed catalog data

### Filter Interaction Test

Test:
- changed media type, genre, and score filters

Expected result:
- visible results update according to filter selections

Observed result:
- filtering behavior worked correctly with backend data

### Detail View Test

Test:
- clicked `View Details` on a media card

Expected result:
- detail panel displays title information, genres, contributor credits, and user metrics

Observed result:
- detail panel updated successfully

### Contributor Panel Test

Test:
- loaded contributor summary panel and refreshed contributor data

Expected result:
- contributor list appears without breaking the page

Observed result:
- contributor panel rendered correctly

## 5. Syntax And Code Checks

Static verification completed:

- backend files checked with `node --check`
- frontend browser script checked with `node --check`
- importer script checked with `node --check`

Expected result:
- no syntax errors in JavaScript source files

Observed result:
- syntax checks passed

## 6. Remaining Validation Work

Additional testing that can strengthen the final presentation:

- save screenshots of successful API responses
- save screenshots of SQL query outputs
- capture failed constraint examples directly from MySQL
- test the IMDb import workflow with a small filtered dataset

## Conclusion

MediaVault has been validated across the core layers required for the course project:

- normalized database schema
- integrity constraints
- advanced SQL support
- backend API integration
- frontend interaction

This supports the project requirements for implementation, query design, application integration, and testing/validation.
