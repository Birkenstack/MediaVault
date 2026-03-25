# MediaVault Data Dictionary

This document explains the purpose of each table in the MediaVault schema and highlights the keys and rules that enforce data integrity.

## users

Purpose: stores application users who can rate and favorite media.

Primary key: `user_id`

Important columns:
- `username`: unique login/display handle
- `email`: unique user email
- `display_name`: readable name for the UI
- `created_at`: account creation timestamp

Constraints:
- unique on `username`
- unique on `email`
- check to keep username length between 3 and 50 characters

## media

Purpose: master table for every catalog item, regardless of whether it is a movie or TV show.

Primary key: `media_id`

Important columns:
- `title`: title shown in the catalog
- `media_type`: limits records to `MOVIE` or `TV_SHOW`
- `synopsis`: text description
- `release_date`: initial release date
- `original_language`: original spoken language
- `age_certification`: parental guidance/rating label
- `average_critic_score`: critic score from 0 to 100
- `average_audience_score`: audience score from 0 to 100

Constraints:
- unique on `title`, `media_type`, and `release_date`
- checks on `release_date`, `average_critic_score`, and `average_audience_score`

## movie

Purpose: stores movie-only attributes.

Primary key: `media_id`

Foreign keys:
- `media_id` references `media(media_id)`

Important columns:
- `runtime_minutes`: movie runtime
- `box_office_usd`: box office earnings

Constraints:
- runtime range check
- non-negative box office check
- cascade delete when the parent media row is removed

## tv_show

Purpose: stores TV-show-only attributes.

Primary key: `media_id`

Foreign keys:
- `media_id` references `media(media_id)`

Important columns:
- `total_seasons`: number of seasons
- `total_episodes`: number of episodes
- `end_date`: final air date if the show is finished
- `current_status`: running state of the show

Constraints:
- season count must be at least 1
- episode count must be null or at least the season count
- end date must be a valid modern date if present

## genres

Purpose: lookup table for genre labels.

Primary key: `genre_id`

Important columns:
- `genre_name`: unique genre label such as Action or Drama

Constraints:
- unique on `genre_name`

## media_genre

Purpose: bridge table between media and genres.

Primary key: composite key `media_id`, `genre_id`

Foreign keys:
- `media_id` references `media(media_id)`
- `genre_id` references `genres(genre_id)`

Why it exists:
- one media item can have many genres
- one genre can apply to many media items

## contributors

Purpose: stores people who contribute to media, such as actors, directors, and writers.

Primary key: `contributor_id`

Important columns:
- `full_name`: contributor name
- `birth_date`: optional date of birth
- `country_of_origin`: optional home country

Constraints:
- unique on `full_name` and `birth_date` to reduce duplicate person records

## contributor_roles

Purpose: normalized lookup table for role types.

Primary key: `role_id`

Important columns:
- `role_name`: values like Actor, Director, or Writer

Constraints:
- unique on `role_name`

## media_contributor_credit

Purpose: bridge table that connects contributors to media while preserving role-specific details.

Primary key: `credit_id`

Foreign keys:
- `media_id` references `media(media_id)`
- `contributor_id` references `contributors(contributor_id)`
- `role_id` references `contributor_roles(role_id)`

Important columns:
- `character_name`: optional for actor credits
- `credited_as`: display name used in credits
- `billing_order`: ordering in the cast/crew list

Why it exists:
- contributors can work on many media items
- each media item can have many contributors
- one contributor can have different roles on different titles

Constraints:
- unique combination on `media_id`, `contributor_id`, `role_id`, and `character_name`

## user_rating

Purpose: stores user ratings and optional review text for media.

Primary key: composite key `user_id`, `media_id`

Foreign keys:
- `user_id` references `users(user_id)`
- `media_id` references `media(media_id)`

Important columns:
- `rating_value`: decimal score from 0 to 10
- `review_text`: optional written review
- `rated_at`: timestamp of rating submission

Constraints:
- one rating per user per media title
- check to keep rating value between 0 and 10

## user_favorite

Purpose: stores which media titles a user has favorited.

Primary key: composite key `user_id`, `media_id`

Foreign keys:
- `user_id` references `users(user_id)`
- `media_id` references `media(media_id)`

Important columns:
- `favorited_at`: timestamp when the favorite was created

Constraints:
- one favorite per user per media title

## Views

### vw_media_catalog

Purpose: simplifies frontend browsing by flattening shared media fields, subtype fields, and genre labels into one result set.

### vw_contributor_footprint

Purpose: supports cross-domain analysis by summarizing each contributor's credits across movies and TV shows by role.
