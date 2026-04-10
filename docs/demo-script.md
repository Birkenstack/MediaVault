# MediaVault Demo Script

This script is intended for a 20-minute project presentation with time reserved for questions.

## 1. Opening

Say:

MediaVault is a full-stack movie and TV analytics application backed by a normalized MySQL database. Our goal was to model real-world relationships between titles, contributors, genres, and users while supporting advanced SQL queries and a usable web interface.

## 2. Problem Definition

Show:

- project title slide
- problem statement
- scope slide

Say:

Most entertainment datasets contain rich many-to-many relationships. We designed MediaVault to support browsing and analysis across those relationships without redundancy.

## 3. ERD And Schema

Show:

- ERD
- table summary

Key talking points:

- `media` is the shared base entity
- `movie` and `tv_show` separate subtype-specific attributes
- `media_genre` and `media_contributor_credit` resolve many-to-many relationships
- `contributor_roles` avoids repeating role names in every credit row
- user ratings and favorites are separated from catalog data

## 4. Normalization

Say:

The schema is designed in 3NF. Shared attributes live in `media`, type-specific fields are split into subtype tables, and bridge tables remove repeating groups and redundant text storage.

## 5. Database Implementation

Show:

- `schema.sql`
- `seed.sql`
- a few sample table rows

Key talking points:

- primary keys on all entities
- foreign keys on all dependent relationships
- check constraints for ratings, runtimes, scores, and counts
- unique constraints for identity and de-duplication

## 6. Query Demonstration

Show:

- 4 to 6 strongest queries from `db/queries.sql`

Suggested order:

1. catalog view query
2. filter by genre and score
3. contributor across movies and TV shows
4. average user rating and favorite counts
5. top title in each genre
6. `EXISTS` or subquery example

Say:

These queries demonstrate joins, aggregation, views, ranking, and cross-domain analysis.

## 7. Application Demo

Show live app:

- homepage
- filters changing results
- opening a detail panel
- contributor panel

Suggested live flow:

1. open homepage
2. filter to movies only
3. filter by a genre
4. open one title
5. show contributor relationships
6. point out that the frontend is driven by backend API endpoints

## 8. Testing And Validation

Show:

- `docs/testing.md`
- examples of failed insert cases or screenshots

Say:

We validated both successful and failed operations to confirm data integrity and application behavior.

## 9. Originality

Highlight at least one:

- polished full-stack UI over a normalized relational schema
- contributor cross-domain analytics
- reusable views for simplified retrieval
- optional IMDb import workflow for scaling beyond seed data

## 10. Closing

Say:

MediaVault satisfies the core DBMS goals of strong relational design, normalized implementation, advanced querying, and full-stack integration while remaining modular enough for future extension.

## Suggested Q&A Prep

Be ready to answer:

- Why is this schema in 3NF?
- Why use subtype tables instead of one wide media table?
- Why do genres and contributors use bridge tables?
- What constraints were most important?
- How does the backend query the database?
- What would you improve with more time?
