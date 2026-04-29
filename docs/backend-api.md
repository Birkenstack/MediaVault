# MediaVault Backend API

Base URL: http://localhost:3000/api

## Endpoints

GET /health
Returns a simple API health message.

GET /media
Returns media catalog records with optional filters.

Supported query parameters:
- type: MOVIE or TV_SHOW
- genre: genre name such as Drama
- contributor: full contributor name such as Christopher Nolan
- search: text search on title or synopsis
- minCriticScore: minimum critic score
- minAudienceScore: minimum audience score
- sortBy: title, release_date, critic_score, or audience_score
- sortOrder: asc or desc
- limit: max rows returned
- offset: pagination offset

Response pagination fields:
- total: total matching titles before limit/offset
- limit: max rows returned
- offset: pagination offset used for the current page
- hasMore: whether another page of results exists

Example:
GET /api/media?type=MOVIE&genre=Science%20Fiction&minCriticScore=85

GET /media/:id
Returns a single media item with base fields, subtype fields, genres, contributor credits, and user rating summary.

GET /genres
Returns all genres with media counts.

GET /contributors
Returns contributors with optional filters.

Supported query parameters:
- role: role name such as Actor or Director
- search: partial contributor name

Example:
GET /api/contributors?role=Actor&search=Anya

## Suggested Run Steps

1. Install dependencies with npm install
2. Make sure MySQL is running
3. Run db/schema.sql
4. Run db/seed.sql
5. Start the API with npm run dev
