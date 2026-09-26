# Globethrotters: World Atlas

## MVP status

This branch contains the first MVP-focused implementation:

- A built-in editorial catalog for Paris, Lisbon, Rome, Athens, Barcelona and London, so discovery works before community content exists.
- Honest data labels: curated suggestions are marked **Popular**, AI suggestions are not shown as verified, and organic results are never relabelled as sponsored.
- External link-outs for maps, tours and accommodation. These open the provider website; Globetrotters does not yet complete a booking or claim live availability/prices.
- Privacy-light outbound click measurement through the `outbound_clicks` Supabase migration.
- OpenStreetMap tiles by default, with visible attribution and no map API key required for an MVP. Configure a commercial tile provider before significant production traffic.
- Environment files ignored by Git, with `.env.example` documenting public browser variables.
- A normalized catalogue with individual coordinates, five canonical categories, public read policies, provider-safe import tracking, and map rendering for catalogue pins.
- An Overture batch importer for inexpensive base coverage and a protected Google Places candidate importer for the agreed rating/review screening method.

### Local setup

```sh
cp .env.example .env.local
npm ci
npm run dev
```

For a read-only product demo without a Supabase login, run `npm run demo` and open the local URL printed by Vite. Click Paris, Lisbon, Rome, Athens, Barcelona or London to inspect the built-in popular experiences and provider link-outs. Saving and community features require the real Supabase configuration.

### Authentication and signup tracking

The Explore map is public. Visited places, wishlists, ratings, posts, profiles,
messages and connections require an authenticated account. Email/password,
Google and Apple entry points are implemented through Lovable Cloud auth.

Run `lovable_auth_setup.sql` once in Lovable Cloud's SQL editor. It records the
signup source and an optional, unselected outreach consent on each profile.
Authentication emails remain in the protected auth user store. `npm run demo`
uses a placeholder backend for visual review only; test real signups in Lovable
Preview or run `npm run dev` with the project's public cloud environment values.

Run `lovable_recommendation_foundation.sql` once to connect saved catalogue
places to verified community ratings. The app remains backward-compatible
before this migration, but community scores appear only after it is applied.

Run `lovable_catalog_pilot.sql` next to expand Paris and Lisbon to ten editorial
places each. The catalogue now uses four top-level categories: food, culture,
nature and nightlife. Hiking remains available as a Nature subtype/tag. The
script is safe to run more than once.

Run `lovable_launch_cities_completion.sql` after the pilot to bring London,
Rome, Barcelona and Athens to the same balanced ten-item coverage. This gives
the working MVP six complete launch destinations before the automated Overture
rollout begins. The script is idempotent and ends with a category-count check;
Nature should return `4`; every other category should return `2`.

Run `lovable_nature_category_migration.sql` after the catalogue and
recommendation scripts. It merges existing Hiking records into Nature without
losing their trail, urban-hike or cycling subcategories.

Run `lovable_city_metrics_foundation.sql` to move Explore scores into a
provenance-aware data layer. Then run `lovable_city_metrics_editorial_seed.sql`
to load the one-time Food, Culture, Nature, Nightlife and temporary Budget
estimates for all 50 catalogue cities. This path requires no AI secret, deployed
AI function or recurring API usage. Official and open-data records automatically
take precedence when they are added later, followed by permitted published
rankings; community scores take precedence only after at least 25 contributions.

Run `lovable_social_feed_setup.sql` to enable the social feed audiences selected
by users. It lets accepted connections read follower-only posts and their photos,
allows request recipients to accept connections, and keeps close-friends posts
restricted to people explicitly marked as close friends.

Apply the new Supabase migration before enabling outbound click analytics. Provider secrets and Supabase service-role keys must only be configured in server-side function secrets, never in a `VITE_` variable.

## Catalogue population

Apply migrations `20260921183000_catalog_foundation.sql`, `20260921183500_catalog_seed.sql`, and `20260924120000_paris_lisbon_pilot.sql` first. They create 50 editable European market records, seed the initial editorial catalogue, and add the balanced Paris/Lisbon MVP pilot.

For the linked Supabase project, configure the required values in your shell and run the guarded deployment helper:

```sh
export SUPABASE_ACCESS_TOKEN="..."
export SUPABASE_DB_PASSWORD="..."
# Optional until the Google validation pass:
export GOOGLE_PLACES_API_KEY="..."
export CATALOG_IMPORT_SECRET="..."
npm run catalog:deploy
```

The helper applies migrations first. It deploys the Google function only when both optional provider secrets are present; secret values are passed through a protected temporary file and are never committed.

For broad map coverage, configure server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then run:

```sh
python3 -m pip install -r scripts/requirements-import.txt
npm run catalog:pilot:dry
npm run catalog:pilot
```

Run a few cities first and review category coverage before processing all 50. The importer defaults to ten places per category and Overture items are labelled as coverage, not recommendations. It deduplicates normalized names, rejects obvious parking infrastructure misclassified as nature, favors useful subcategory variety and proximity to the city center, and emits a JSON quality report beside the SQL. It can read the complete checked-in city registry with `--local-cities`, so a reviewable batch for all cities can be generated without database credentials. The **Generate Overture catalogue batch** GitHub Action provides the same process through gradual eight-city batches; batch 2 adds Venice, Munich, Copenhagen, Budapest, Brussels, Edinburgh, Porto and Stockholm. Apply `lovable_hide_unreviewed_coverage.sql` before importing: raw coverage remains service-side until an explicit approval promotes it to `popular`, `editorial`, or `community`.

For hiking, keep durable trail records independent of consumer review platforms. OpenStreetMap/Overpass and licensed official park or tourism data can supply route geometry and factual attributes. AllTrails may be linked as an outbound reference when permitted, but its trail descriptions, photos, reviews, rankings and route collection must not be imported without a partnership or explicit licence. Outdooractive is the preferred commercial API candidate if the product later needs synchronized route geometry, elevation, difficulty and editorial trail content.

The `import-google-candidates` Edge Function is deliberately protected by `CATALOG_IMPORT_SECRET`. Supply one to five city slugs per invocation; it defaults to food and culture, requests no more than three result pages per city/category, and selects ten candidates by a review-volume-adjusted rating score after requiring at least 1,000 reviews. This means “best from the bounded Google candidate set”, not an exhaustive guarantee across every place on Google Maps. `selectionLimit` can later raise the result to 25 per category without changing the MVP default. Run `lovable_google_catalog_matching.sql` before the function: it adds a conservative name-and-distance match from each selected Google Place ID to an independently sourced catalogue row. Matches remain pending until an explicit service-role editorial approval promotes the catalogue item. Google names, coordinates, ratings and review counts are returned for immediate admin review but are not persisted. Any interface that displays that response must follow Google Maps attribution and current Places policies.

Loveable Prompt – Globethrotters Social Platform

Create a modern, premium, intuitive social platform called Globethrotters, focused on meaningful travel, discovery, and personal curation rather than vanity metrics. The platform should feel aesthetic, calm, and aspirational (similar emotional tone to Pinterest, Airbnb, and Apple design).

1. Core Concept

Globethrotters is a social travel platform where users visually map their journeys on an interactive world map and build curated travel knowledge. The main interface is a dynamic world map background that evolves as users travel and explore.

Users can:

Pin places they have visited.

Pin places they want to visit.

Organize experiences and memories.

Discover high-quality recommendations.

2. Visual Identity & UI

Style:

Clean, premium, minimalist.

Earth tones, soft beige, muted blues, warm neutrals.

Elegant typography.

Subtle animations.

Homepage:

Full-screen world map as the main background.

Smooth zoom and hover interactions.

Pins with two main colors:

Visited places → warm tone (gold / terracotta).

Wishlist places → soft blue / grey.

Optional:

Heatmap effect showing travel intensity.

Travel timeline.

3. Map Features

When clicking a location, users can:

Add it to visited or wishlist.

See community insights.

Save and organize content.

Each location includes:

Personal notes.

Photos and short videos.

Ratings.

Tags (food, culture, nature, nightlife, wellness, etc.).

4. Lists & Curation

Users can create curated lists such as:

Best food in a city.

Hidden gems.

Cafés.

Experiences.

Nature and hikes.

Luxury vs budget.

They can also create:

“Top 10 favorite places in the world.”

Themed lists (solo travel, romantic, digital nomad, etc.).

These lists should feel editorial and aesthetic.

5. Privacy & Social Layer

Users control privacy levels:

Private.

Friends only.

Public.

Users can:

Follow others.

Save their lists.

Collaborate on travel collections.

The platform should prioritize authenticity and meaningful travel rather than influencer culture.

6. Smart Discovery

When a user clicks a destination in their wishlist:

The platform suggests:

Experiences.

Restaurants.

Cafés.

Hikes.

Hotels.

Local hidden gems.

Recommendations are based on:

User preferences.

Similar travelers.

Trusted high-quality reviews.

The system should use AI-driven personalization.

7. Gamification & Levels

Create a gamified progression system:

Levels based on:

Countries visited.

Continents explored.

Experiences completed.

Cultural depth.

Adventure (e.g., 10+ long hikes).

Sustainable travel actions.

Examples:

Explorer.

Cultural Curator.

Global Insider.

Adventure Master.

Include badges and travel achievements.

8. Business Model

Primary:

Premium advertising for businesses (restaurants, hotels, experiences).

Only verified businesses with strong reviews and quality standards can be promoted.

No spam or low-quality ads.

Secondary:

Subscription for advanced features:

AI travel planning.

Exclusive lists.

Offline access.

9. Optional Ethical Advertising Model

Users can opt-in to see ads in exchange for:

Platform credits.

Premium features.

Travel discounts.

The platform communicates clearly:

The user is not the product.

Advertising is optional and transparent.

Credits can be used for:

Travel planning tools.

Premium map features.

Discounts on experiences.

10. Community & Trust

Add trust layers:

Verified travelers.

Review credibility scoring.

Experience validation (tickets, photos, GPS).

Focus on:

High signal-to-noise.

Quality over quantity.

11. Future Vision

Possible expansion:

AI travel companion.

Collaborative travel itineraries.

Sustainable travel scoring.

Integration with booking platforms.

Travel social graph.

Partnerships with airlines and tourism boards.

12. Tech & Product Suggestions

Include:

Mobile-first design.

Strong performance.

Scalable architecture.

Data privacy and security.

Modern backend with AI recommendation engine.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3a4706a0-ae8b-4a80-8fea-187198e2322d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
