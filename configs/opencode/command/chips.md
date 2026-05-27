---
description: Smart app feature flow mapper — signup → features → philosophy
---

# `/chips` — App Feature Dependency Mapper

Maps any app type into a structured feature dependency tree (chips). Each chip represents one feature with tech stack recommendations, competitor analysis, and differentiation — all with persistent progress tracking.

---

## SECTION 1: Purpose & Usage

### Syntax

```
/chips <app-type> [--force] [--resume] [--done <id>] [--start <id>] [--reset]
```

### Argument

`$ARGUMENTS` — the raw text after `/chips`. Parsed as:
- First token(s) before flags: the app type (e.g., `bank app`, `social media`, `e-commerce for pet supplies`)
- Everything after `--` is a flag

### Examples

```
/chips bank app
/chips social media
/chips e-commerce --force
/chips marketplace --resume
/chips food delivery --done email-password --done user-profile
/chips health app --start core-workout-tracking
/chips productivity --reset
/chips
```

### Flags

| Flag | Purpose |
|------|---------|
| `--force` | Overwrite existing `.chips/status.json` without asking |
| `--resume` | Resume from existing `.chips/status.json` without asking |
| `--done <id>` | Mark a specific chip as completed |
| `--start <id>` | Mark a specific chip as in-progress |
| `--reset` | Mark all chips back to pending |

### What It Produces

- A visual chip map printed to terminal (Tier 0 Registration → Tier 7 Philosophy)
- Per chip: status symbol, tech stack (library + purpose + alternative), competitor analysis with sources, differentiation
- NEXT chip suggestion: lowest tier where all dependencies are met
- `.chips/status.json` persisted for resumability

### What It Does NOT Do

- Does NOT generate any code
- Does NOT modify files outside `.chips/`
- Does NOT inspect or audit existing codebase
- Does NOT connect to Jira/Linear/Notion

---

## SECTION 2: Core Workflow (8 Steps)

### Step 1: Classify App Type

Parse `$ARGUMENTS` to extract app type. Match against 14 known domain templates:

- `bank`, `banking`, `fintech`, `finance`, `financial` → Banking
- `social`, `social media`, `social network`, `community` → Social
- `ecommerce`, `e-commerce`, `shop`, `store`, `retail` → E-commerce
- `saas`, `b2b`, `business`, `enterprise` → SaaS
- `marketplace`, `peer-to-peer`, `p2p` → Marketplace
- `food`, `delivery`, `restaurant`, `food delivery` → Food Delivery
- `health`, `fitness`, `wellness`, `medical`, `healthcare` → Health/Fitness
- `productivity`, `todo`, `task`, `project management` → Productivity
- `dating`, `match`, `relationship` → Dating
- `travel`, `hotel`, `booking`, `trip` → Travel
- `real estate`, `property`, `rental`, `housing` → Real Estate
- `education`, `learning`, `course`, `tutoring` → Education
- `gaming`, `game`, `play` → Gaming
- `ai`, `llm`, `chatbot`, `gpt`, `intelligence` → AI/LLM
- `music` → Social (extended)

If no match, ask 3-5 discovery questions to determine the correct template:

1. "Who are the primary users? (consumers, businesses, both)"
2. "What is the core transaction or action users perform?"
3. "Is there a financial exchange? (payments, subscriptions, free)"
4. "Is there real-time communication or matching between users?"
5. "Does this app rely on user-generated content or curated content?"

Based on answers, either assign the closest domain template or use a generic template with appropriate tiers.

### Step 2: Check Existing Progress

Look for `.chips/status.json` in:
1. Current working directory (if inside a project)
2. Parent directories (climb up to find project root with package.json or similar)

If `.chips/status.json` exists AND no override flags are set:

```
Found existing chips progress for this project.
[O] Overwrite (start fresh)
[R] Resume from where you left off
[C] Cancel
Default: Resume (15s timeout)
```

Timeout defaults to resume. `--force` skips this entirely and overwrites. `--resume` skips and resumes.

If `.chips/status.json` is corrupted (invalid JSON), warn:

```
WARNING: .chips/status.json is corrupted or unparseable.
Use --reset to start fresh, or manually fix the file.
```

### Step 3: Generate Feature Dependency Tree

Based on the matched domain template (Section 3), generate 5-8 tiers of chips:

- Tier 0: Registration/Auth — the foundation, everything depends on this
- Tier 1: Setup/Profile — user identity and preferences
- Tier 2: Core Feature — the primary value proposition
- Tier 3: Engagement — keeping users coming back
- Tier 4: Monetization — revenue generation
- Tier 5: Advanced — power features for experienced users
- Tier 6: Social/Viral — network effects and sharing
- Tier 7: Cross-cutting/Philosophy — principles that apply everywhere

Each chip is a node in a dependency graph. Chips in lower tiers unlock chips in higher tiers. The dependency chain must be acyclic.

### Step 4: Per-Chip Content Generation

For each chip, generate:

**Status Symbol**
- ◻ pending (not started, deps may or may not be met)
- ⏳ ready (deps met but not started)
- 🔄 in-progress (actively being worked on)
- ✅ completed (finished)
- ➡ next (the single best thing to work on now)

**Tech Stack Recommendation**
Format: `library — purpose — alternative`

Example:
```
zod + react-hook-form — schema validation + form state — alternative: formik + yup (more mature, heavier bundle)
```

Rules:
- Always include a library name, a one-line purpose, and at least one trade-off alternative
- Prefer open-source libraries with active maintenance
- Favor TypeScript-first libraries when applicable
- Use `grep_app_searchGitHub` for real-world usage examples

**Competitor Analysis**
Format: `source: [app name] [what they do]`

Example:
```
competitors:
  source: Mint — automated bank sync + transaction categorization
  source: YNAB — manual envelope budgeting with goal tracking
  source: Splitwise — group expense splitting with IOUs
```

Rules:
- At least 2 competitors per chip, maximum 4
- Label every claim with a source app name
- Use `websearch_web_search_exa` for current data:
  - Query format: "top [domain] apps [feature] 2025" or "best [app type] app [feature] comparison"
  - Query format for features: "[app type] app [feature] example"
- If web search is unavailable, note "offline — competitor data may be less current"

**Differentiation**
What makes this chip better than competitors. Must be concrete.

Good: "supports offline-first sync on slow connections so users in rural areas never lose data"
Good: "uses on-device ML for categorization instead of sending transaction data to cloud"
Bad: "better UX" (too vague)
Bad: "improved performance" (too generic)
Bad: "industry-leading" (unsubstantiated)

Format each differentiation as a single sentence explaining the specific advantage.

### Step 5: Output Formatted Chip Map

Display the chip map using the exact visual format from Section 5. The output must include:

1. Header with app type
2. All tiers with their chips
3. Status symbols for each chip
4. Tech stack recommendations inline
5. Any dependency warnings (e.g., "needs [dependency]")
6. Philosophy tier chips
7. NEXT chip suggestion at the bottom
8. Footer summary

### Step 6: Determine NEXT Chip

The NEXT chip is determined by:
1. Find all chips with status ◻ pending
2. Among those, find chips where ALL dependencies are status ✅ completed or 🔄 in-progress
3. Select the one in the lowest tier (Tier 0 > Tier 1 > ...)
4. If there are multiple at the same tier, select the one with the most completed dependents (unlocks the most value)
5. Mark this chip with status ➡ next

If all chips are completed, NEXT is: "All chips complete! Run --reset to re-plan or start a new app type."

### Step 7: Handle Flags

**`--done <id>`**
- Find chip by id in the status file
- Change its status from ◻ pending/⏳ ready/🔄 in-progress ➡ ✅ completed
- Recalculate all downstream dependency statuses
- Re-run NEXT chip determination
- Print updated chip map showing only the changed statuses

**`--start <id>`**
- Find chip by id
- Verify all dependencies are ✅ completed
- If deps not met, print error: "Cannot start [id]: [dependency] is still pending"
- If deps met, change status from ◻ pending/⏳ ready ➡ 🔄 in-progress
- Print updated chip map

**`--reset`**
- Set all chips to ◻ pending
- Clear any recorded completion timestamps
- Print: "All chips reset to pending. Run '/chips [app-type]' to regenerate the tree."

**`--force`**
- Skip the overwrite/resume/cancel prompt in Step 2
- Proceed as if user chose Overwrite
- Old status file is backed up as `.chips/status.json.bak` before overwriting

### Step 8: Persist to `.chips/status.json`

Write the current chip state to `.chips/status.json` at the project root.

File structure:

```json
{
  "appType": "bank app",
  "version": 1,
  "createdAt": "2026-05-14T10:30:00Z",
  "updatedAt": "2026-05-14T10:35:00Z",
  "tiers": [
    {
      "tier": 0,
      "name": "Registration",
      "chips": [
        {
          "id": "email-password",
          "label": "Email/Password Authentication",
          "status": "completed",
          "dependsOn": [],
          "unlocks": ["kyc-verification", "biometric-setup"],
          "tech": {
            "library": "next-auth or supabase-auth",
            "purpose": "Managed auth with email/password + OAuth providers",
            "alternative": "Clerk (easier setup, proprietary, starts at $50/mo)"
          },
          "competitors": [
            "source: Chime — instant account opening with email + phone verification",
            "source: Revolut — 3-step signup with document scan"
          ],
          "differentiation": [
            "Supports offline-first registration — user completes signup form and submits when connection returns"
          ]
        }
      ]
    }
  ]
}
```

Status values: `"pending"`, `"ready"`, `"in-progress"`, `"completed"`
Version increments on each mutation. Timestamps in ISO 8601.

---

## SECTION 3: Domain Templates

Each template defines the chip structure for a specific app domain. Templates provide the initial dependency tree that the mapper fills with dynamic content (tech recs, competitor data, differentiation).

### 3.1 Banking / Fintech

**Tier 0: Registration (4 chips)**
- email-password (dependsOn: [], unlocks: kyc-verification, biometric-setup)
- phone-verification (dependsOn: [], unlocks: kyc-verification)
- kyc-verification (dependsOn: email-password, phone-verification, unlocks: checking-account, savings-account)
- biometric-setup (dependsOn: email-password, unlocks: fast-auth)

**Tier 1: Profile & Accounts (4 chips)**
- checking-account (dependsOn: kyc-verification, unlocks: deposits, transfers)
- savings-account (dependsOn: kyc-verification, unlocks: savings-goals)
- fast-auth (dependsOn: biometric-setup, unlocks: instant-payments)
- account-preferences (dependsOn: checking-account, unlocks: notifications)

**Tier 2: Core Financial (5 chips)**
- deposits (dependsOn: checking-account, unlocks: transaction-history)
- transfers (dependsOn: checking-account, unlocks: recurring-payments, bill-pay)
- transaction-history (dependsOn: deposits, transfers, unlocks: spending-insights)
- bill-pay (dependsOn: transfers, unlocks: recurring-payments)
- savings-goals (dependsOn: savings-account, unlocks: auto-save)

**Tier 3: Engagement (4 chips)**
- spending-insights (dependsOn: transaction-history, unlocks: budgeting)
- budgeting (dependsOn: spending-insights, unlocks: financial-health-score)
- notifications (dependsOn: account-preferences, unlocks: push-alerts)
- recurring-payments (dependsOn: transfers, bill-pay, unlocks: subscription-manager)

**Tier 4: Monetization (4 chips)**
- subscription-plans (dependsOn: checking-account, unlocks: premium-features)
- premium-features (dependsOn: subscription-plans, unlocks: investment-account)
- instant-payments (dependsOn: fast-auth, unlocks: peer-to-peer)
- international-transfers (dependsOn: checking-account, unlocks: multi-currency)

**Tier 5: Advanced (4 chips)**
- investment-account (dependsOn: premium-features, unlocks: portfolio-tracking)
- portfolio-tracking (dependsOn: investment-account, unlocks: stock-trading)
- credit-score-monitoring (dependsOn: kyc-verification, unlocks: loan-products)
- financial-health-score (dependsOn: budgeting, unlocks: personalized-advice)

**Tier 6: Social (3 chips)**
- peer-to-peer (dependsOn: instant-payments, unlocks: request-money, split-bill)
- request-money (dependsOn: peer-to-peer, unlocks: group-expenses)
- split-bill (dependsOn: peer-to-peer, unlocks: group-expenses)

**Tier 7: Philosophy (8 chips — see Section 4)**

### 3.2 Social Media

**Tier 0: Registration (4 chips)**
- email-phone-signup (dependsOn: [], unlocks: username-setup, profile-creation)
- oauth-connect (dependsOn: [], unlocks: profile-creation, friend-finder)
- username-setup (dependsOn: email-phone-signup, unlocks: profile-creation)
- profile-creation (dependsOn: username-setup, oauth-connect, email-phone-signup, unlocks: content-feed, friend-finder)

**Tier 1: Profile & Identity (4 chips)**
- avatar-media (dependsOn: profile-creation, unlocks: bio-status, stories)
- bio-status (dependsOn: profile-creation, unlocks: content-feed)
- privacy-settings (dependsOn: profile-creation, unlocks: content-visibility)
- friend-finder (dependsOn: profile-creation, oauth-connect, unlocks: social-graph)

**Tier 2: Core Content (5 chips)**
- content-feed (dependsOn: profile-creation, bio-status, unlocks: likes-comments, share)
- content-creation (dependsOn: avatar-media, unlocks: stories, posts)
- likes-comments (dependsOn: content-feed, unlocks: notifications, engagement-metrics)
- share (dependsOn: content-feed, unlocks: viral-loop)
- stories (dependsOn: avatar-media, content-creation, unlocks: ephemeral-content)

**Tier 3: Engagement (4 chips)**
- social-graph (dependsOn: friend-finder, unlocks: friend-suggestions, feed-algorithm)
- notifications (dependsOn: likes-comments, unlocks: push-alerts)
- friend-suggestions (dependsOn: social-graph, unlocks: network-growth)
- feed-algorithm (dependsOn: social-graph, unlocks: personalized-feed)

**Tier 4: Monetization (4 chips)**
- sponsored-content (dependsOn: content-feed, unlocks: ad-manager)
- ad-manager (dependsOn: sponsored-content, unlocks: analytics-dashboard)
- premium-subscriptions (dependsOn: content-creation, unlocks: exclusive-content)
- tipping-creators (dependsOn: premium-subscriptions, unlocks: creator-payouts)

**Tier 5: Advanced (4 chips)**
- analytics-dashboard (dependsOn: ad-manager, unlocks: content-insights)
- content-insights (dependsOn: analytics-dashboard, unlocks: trend-prediction)
- moderation-tools (dependsOn: content-feed, unlocks: auto-moderation)
- ephemeral-content (dependsOn: stories, unlocks: story-analytics)

**Tier 6: Viral/Social (3 chips)**
- viral-loop (dependsOn: share, unlocks: invite-system, referral-tracking)
- invite-system (dependsOn: viral-loop, unlocks: referral-rewards)
- referral-tracking (dependsOn: invite-system, unlocks: referral-analytics)

**Tier 7: Philosophy (8 chips — see Section 4)**

### 3.3 E-commerce

**Tier 0: Registration (3 chips)**
- email-signup (dependsOn: [], unlocks: profile, address-book)
- oauth-signup (dependsOn: [], unlocks: profile)
- profile (dependsOn: email-signup, oauth-signup, unlocks: wishlist, order-history)

**Tier 1: Setup (4 chips)**
- address-book (dependsOn: email-signup, unlocks: checkout)
- payment-methods (dependsOn: profile, unlocks: checkout)
- shipping-preferences (dependsOn: address-book, unlocks: checkout)
- wishlist (dependsOn: profile, unlocks: notifications)

**Tier 2: Core Shopping (5 chips)**
- product-catalog (dependsOn: profile, unlocks: search, product-detail)
- search (dependsOn: product-catalog, unlocks: filters)
- product-detail (dependsOn: product-catalog, unlocks: reviews, cart)
- cart (dependsOn: product-detail, unlocks: checkout)
- reviews (dependsOn: product-detail, unlocks: ratings)

**Tier 3: Engagement (4 chips)**
- checkout (dependsOn: cart, payment-methods, address-book, shipping-preferences, unlocks: order-tracking)
- order-tracking (dependsOn: checkout, unlocks: returns)
- returns (dependsOn: order-tracking, unlocks: refunds)
- notifications (dependsOn: wishlist, order-tracking, unlocks: push-alerts)

**Tier 4: Monetization (4 chips)**
- promotions-coupons (dependsOn: checkout, unlocks: flash-sales)
- flash-sales (dependsOn: promotions-coupons, unlocks: timed-deals)
- loyalty-program (dependsOn: order-tracking, unlocks: points-system)
- subscription-box (dependsOn: checkout, unlocks: recurring-orders)

**Tier 5: Advanced (4 chips)**
- personalized-recommendations (dependsOn: product-catalog, order-tracking, unlocks: home-feed)
- seller-dashboard (dependsOn: product-catalog, unlocks: inventory-management)
- inventory-management (dependsOn: seller-dashboard, unlocks: stock-alerts)
- multi-vendor-support (dependsOn: seller-dashboard, unlocks: vendor-payouts)

**Tier 6: Social (3 chips)**
- social-sharing (dependsOn: product-detail, unlocks: referral-links)
- referral-links (dependsOn: social-sharing, unlocks: referral-analytics)
- group-buying (dependsOn: referral-links, unlocks: volume-discounts)

**Tier 7: Philosophy (8 chips — see Section 4)**

### 3.4 SaaS / B2B

**Tier 0: Registration (4 chips)**
- email-signup (dependsOn: [], unlocks: workspace-creation, team-invite)
- oauth-sso (dependsOn: [], unlocks: workspace-creation)
- workspace-creation (dependsOn: email-signup, oauth-sso, unlocks: dashboard, member-management)
- team-invite (dependsOn: email-signup, unlocks: member-management)

**Tier 1: Setup (4 chips)**
- dashboard (dependsOn: workspace-creation, unlocks: analytics, integrations)
- member-management (dependsOn: workspace-creation, team-invite, unlocks: roles-permissions)
- roles-permissions (dependsOn: member-management, unlocks: audit-log)
- billing-setup (dependsOn: workspace-creation, unlocks: subscription-management)

**Tier 2: Core Product (5 chips)**
- primary-feature (dependsOn: dashboard, unlocks: feature-extensions)
- data-ingestion (dependsOn: dashboard, unlocks: reporting)
- reporting (dependsOn: data-ingestion, unlocks: exports)
- analytics (dependsOn: dashboard, unlocks: insights)
- integrations (dependsOn: dashboard, unlocks: api-access)

**Tier 3: Engagement (4 chips)**
- collaboration (dependsOn: member-management, primary-feature, unlocks: comments, shared-views)
- notifications (dependsOn: primary-feature, unlocks: email-digest)
- activity-feed (dependsOn: primary-feature, unlocks: change-history)
- shared-views (dependsOn: collaboration, unlocks: templates)

**Tier 4: Monetization (4 chips)**
- subscription-management (dependsOn: billing-setup, unlocks: tiered-plans)
- tiered-plans (dependsOn: subscription-management, unlocks: usage-based-billing)
- usage-based-billing (dependsOn: tiered-plans, unlocks: metering)
- metering (dependsOn: usage-based-billing, unlocks: overage-alerts)

**Tier 5: Advanced (4 chips)**
- api-access (dependsOn: integrations, unlocks: webhooks, rate-limiting)
- webhooks (dependsOn: api-access, unlocks: event-driven-integrations)
- audit-log (dependsOn: roles-permissions, unlocks: compliance-reports)
- compliance-reports (dependsOn: audit-log, unlocks: soc2-evidence)

**Tier 6: Ecosystem (3 chips)**
- marketplace (dependsOn: api-access, unlocks: third-party-plugins)
- partner-portal (dependsOn: marketplace, unlocks: referral-management)
- referral-management (dependsOn: partner-portal, unlocks: partner-analytics)

**Tier 7: Philosophy (8 chips — see Section 4)**

### 3.5 Marketplace

**Tier 0: Registration (4 chips)**
- buyer-signup (dependsOn: [], unlocks: buyer-profile)
- seller-signup (dependsOn: [], unlocks: seller-profile, listing-creation)
- buyer-profile (dependsOn: buyer-signup, unlocks: saved-searches, purchase-history)
- seller-profile (dependsOn: seller-signup, unlocks: seller-dashboard)

**Tier 1: Setup (4 chips)**
- listing-creation (dependsOn: seller-signup, unlocks: search-browse, listing-management)
- seller-dashboard (dependsOn: seller-profile, unlocks: analytics, order-management)
- saved-searches (dependsOn: buyer-profile, unlocks: search-alerts)
- payment-setup (dependsOn: buyer-signup, seller-signup, unlocks: transaction-processing)

**Tier 2: Core Marketplace (5 chips)**
- search-browse (dependsOn: listing-creation, unlocks: filters, bookmarks)
- filters (dependsOn: search-browse, unlocks: advanced-search)
- listing-management (dependsOn: listing-creation, unlocks: bulk-edit, scheduling)
- transaction-processing (dependsOn: payment-setup, unlocks: order-management, dispute-resolution)
- messaging (dependsOn: buyer-profile, seller-profile, unlocks: negotiation)

**Tier 3: Engagement (4 chips)**
- order-management (dependsOn: transaction-processing, unlocks: tracking, reviews)
- reviews-ratings (dependsOn: order-management, unlocks: seller-reputation)
- search-alerts (dependsOn: saved-searches, unlocks: push-notifications)
- bookmarks (dependsOn: search-browse, unlocks: compare)

**Tier 4: Monetization (4 chips)**
- commission-fees (dependsOn: transaction-processing, unlocks: featured-listings)
- featured-listings (dependsOn: commission-fees, unlocks: promoted-search)
- promoted-search (dependsOn: featured-listings, unlocks: ad-dashboard)
- subscription-seller-tiers (dependsOn: seller-dashboard, unlocks: premium-tools)

**Tier 5: Advanced (4 chips)**
- dispute-resolution (dependsOn: transaction-processing, unlocks: escrow)
- escrow (dependsOn: dispute-resolution, unlocks: secure-payments)
- bulk-edit (dependsOn: listing-management, unlocks: csv-import)
- scheduling (dependsOn: listing-management, unlocks: calendar-sync)

**Tier 6: Trust (3 chips)**
- seller-verification (dependsOn: seller-profile, unlocks: verified-badge)
- verified-badge (dependsOn: seller-verification, unlocks: trust-score)
- trust-score (dependsOn: reviews-ratings, verified-badge, unlocks: top-seller-program)

**Tier 7: Philosophy (8 chips — see Section 4)**

### 3.6 Food Delivery

**Tier 0: Registration (3 chips)**
- phone-signup (dependsOn: [], unlocks: delivery-address, profile)
- oauth-signup (dependsOn: [], unlocks: profile)
- profile (dependsOn: phone-signup, oauth-signup, unlocks: favorites, order-history)

**Tier 1: Setup (4 chips)**
- delivery-address (dependsOn: phone-signup, unlocks: restaurant-browse)
- payment-methods (dependsOn: profile, unlocks: checkout)
- cuisine-preferences (dependsOn: profile, unlocks: personalized-feed)
- dietary-restrictions (dependsOn: profile, unlocks: menu-filters)

**Tier 2: Core Ordering (5 chips)**
- restaurant-browse (dependsOn: delivery-address, unlocks: menu-view, search)
- menu-view (dependsOn: restaurant-browse, unlocks: cart, customizations)
- search (dependsOn: restaurant-browse, unlocks: filters)
- cart (dependsOn: menu-view, unlocks: checkout)
- customizations (dependsOn: menu-view, unlocks: special-instructions)

**Tier 3: Engagement (4 chips)**
- checkout (dependsOn: cart, payment-methods, delivery-address, unlocks: order-tracking)
- order-tracking (dependsOn: checkout, unlocks: live-map, notifications)
- favorites (dependsOn: profile, unlocks: reorder)
- reviews (dependsOn: order-tracking, unlocks: ratings)

**Tier 4: Monetization (4 chips)**
- delivery-fee (dependsOn: checkout, unlocks: pricing-model)
- subscription-pass (dependsOn: checkout, unlocks: free-delivery)
- promo-codes (dependsOn: checkout, unlocks: referral-discounts)
- tips (dependsOn: checkout, unlocks: driver-ratings)

**Tier 5: Advanced (4 chips)**
- scheduled-orders (dependsOn: checkout, unlocks: recurring-orders)
- group-ordering (dependsOn: checkout, unlocks: split-bill)
- driver-tracking (dependsOn: order-tracking, unlocks: eta-prediction)
- loyalty-points (dependsOn: order-tracking, unlocks: rewards-store)

**Tier 6: Social (3 chips)**
- referral-system (dependsOn: profile, unlocks: referral-tracking)
- shared-order-lists (dependsOn: group-ordering, unlocks: team-lunches)
- food-sharing (dependsOn: reviews, unlocks: social-feed)

**Tier 7: Philosophy (8 chips — see Section 4)**

### 3.7 Health / Fitness

**Tier 0: Registration (3 chips)**
- email-signup (dependsOn: [], unlocks: health-profile)
- oauth-signup (dependsOn: [], unlocks: health-profile)
- health-profile (dependsOn: email-signup, oauth-signup, unlocks: goals, body-metrics)

**Tier 1: Setup (4 chips)**
- goals (dependsOn: health-profile, unlocks: workout-plan, nutrition-plan)
- body-metrics (dependsOn: health-profile, unlocks: progress-tracking)
- device-connect (dependsOn: health-profile, unlocks: auto-sync)
- preferences (dependsOn: health-profile, unlocks: notifications)

**Tier 2: Core Training (5 chips)**
- workout-plan (dependsOn: goals, unlocks: exercise-log, workout-library)
- nutrition-plan (dependsOn: goals, unlocks: meal-log, recipe-library)
- exercise-log (dependsOn: workout-plan, unlocks: progress-tracking)
- meal-log (dependsOn: nutrition-plan, unlocks: calorie-tracking)
- workout-library (dependsOn: workout-plan, unlocks: custom-routines)

**Tier 3: Engagement (4 chips)**
- progress-tracking (dependsOn: exercise-log, body-metrics, unlocks: charts, achievements)
- calorie-tracking (dependsOn: meal-log, unlocks: nutrition-insights)
- achievements (dependsOn: progress-tracking, unlocks: streaks)
- reminders (dependsOn: preferences, unlocks: habit-building)

**Tier 4: Monetization (4 chips)**
- premium-plans (dependsOn: workout-library, unlocks: personalized-coaching)
- personalized-coaching (dependsOn: premium-plans, unlocks: ai-workouts)
- meal-plan-subscription (dependsOn: recipe-library, unlocks: grocery-lists)
- challenges (dependsOn: achievements, unlocks: paid-competitions)

**Tier 5: Advanced (4 chips)**
- custom-routines (dependsOn: workout-library, unlocks: share-routines)
- recipe-library (dependsOn: nutrition-plan, unlocks: meal-plan-subscription)
- ai-workouts (dependsOn: personalized-coaching, unlocks: adaptive-training)
- grocery-lists (dependsOn: meal-plan-subscription, unlocks: delivery-integration)

**Tier 6: Social (3 chips)**
- friend-challenges (dependsOn: challenges, unlocks: leaderboards)
- leaderboards (dependsOn: friend-challenges, unlocks: community-events)
- share-workouts (dependsOn: custom-routines, unlocks: social-feed)

**Tier 7: Philosophy (8 chips — see Section 4)**

### 3.8 Productivity

**Tier 0: Registration (3 chips)**
- email-signup (dependsOn: [], unlocks: workspace)
- oauth-sso (dependsOn: [], unlocks: workspace)
- workspace (dependsOn: email-signup, oauth-sso, unlocks: projects, preferences)

**Tier 1: Setup (4 chips)**
- projects (dependsOn: workspace, unlocks: tasks, boards)
- teams (dependsOn: workspace, unlocks: task-assignment)
- preferences (dependsOn: workspace, unlocks: theme, notifications)
- integrations-setup (dependsOn: workspace, unlocks: calendar-sync, file-storage)

**Tier 2: Core Work (5 chips)**
- tasks (dependsOn: projects, unlocks: subtasks, due-dates)
- boards (dependsOn: projects, unlocks: columns, drag-drop)
- calendars (dependsOn: projects, unlocks: timeline, scheduling)
- documents (dependsOn: projects, unlocks: editing, templates)
- file-storage (dependsOn: integrations-setup, unlocks: file-sharing)

**Tier 3: Engagement (4 chips)**
- comments (dependsOn: tasks, documents, unlocks: mentions)
- notifications (dependsOn: preferences, tasks, unlocks: push-alerts)
- activity-log (dependsOn: tasks, unlocks: change-history)
- due-dates (dependsOn: tasks, unlocks: reminders)

**Tier 4: Monetization (4 chips)**
- tiered-seats (dependsOn: teams, unlocks: guest-access)
- guest-access (dependsOn: tiered-seats, unlocks: client-sharing)
- storage-upgrades (dependsOn: file-storage, unlocks: version-history)
- premium-templates (dependsOn: templates, unlocks: template-marketplace)

**Tier 5: Advanced (4 chips)**
- automations (dependsOn: tasks, unlocks: rules-engine)
- rules-engine (dependsOn: automations, unlocks: custom-workflows)
- time-tracking (dependsOn: tasks, unlocks: reports)
- reports (dependsOn: time-tracking, unlocks: analytics)

**Tier 6: Collaboration (3 chips)**
- real-time-collaboration (dependsOn: documents, unlocks: co-editing)
- co-editing (dependsOn: real-time-collaboration, unlocks: change-conflicts)
- approvals (dependsOn: tasks, unlocks: review-workflows)

**Tier 7: Philosophy (8 chips — see Section 4)**

### 3.9 Dating

**Tier 0: Registration (3 chips)**
- phone-signup (dependsOn: [], unlocks: basic-profile)
- oauth-signup (dependsOn: [], unlocks: basic-profile)
- basic-profile (dependsOn: phone-signup, oauth-signup, unlocks: photo-upload, preferences)

**Tier 1: Setup (4 chips)**
- photo-upload (dependsOn: basic-profile, unlocks: profile-completion)
- preferences (dependsOn: basic-profile, unlocks: discovery-settings)
- bio-interests (dependsOn: basic-profile, unlocks: profile-completion)
- location-permission (dependsOn: basic-profile, unlocks: discovery-feed)

**Tier 2: Core Matching (5 chips)**
- profile-completion (dependsOn: photo-upload, bio-interests, unlocks: discovery-feed)
- discovery-feed (dependsOn: profile-completion, location-permission, preferences, unlocks: swipe, filters)
- swipe (dependsOn: discovery-feed, unlocks: match, likes-sent)
- filters (dependsOn: discovery-feed, unlocks: advanced-search)
- daily-suggestions (dependsOn: discovery-feed, unlocks: curated-matches)

**Tier 3: Engagement (4 chips)**
- match (dependsOn: swipe, unlocks: messaging, notifications)
- messaging (dependsOn: match, unlocks: chat-features, media-sharing)
- likes-sent (dependsOn: swipe, unlocks: like-back)
- notifications (dependsOn: match, unlocks: push-alerts)

**Tier 4: Monetization (4 chips)**
- premium-subscription (dependsOn: profile-completion, unlocks: unlimited-swipes, see-likes)
- unlimited-swipes (dependsOn: premium-subscription, unlocks: super-likes)
- see-likes (dependsOn: premium-subscription, unlocks: priority-profile)
- super-likes (dependsOn: unlimited-swipes, unlocks: boost)

**Tier 5: Advanced (4 chips)**
- chat-features (dependsOn: messaging, unlocks: voice-notes, video-call)
- media-sharing (dependsOn: messaging, unlocks: photo-sharing)
- video-call (dependsOn: chat-features, unlocks: virtual-dates)
- icebreakers (dependsOn: messaging, unlocks: conversation-starters)

**Tier 6: Safety (3 chips)**
- profile-verification (dependsOn: photo-upload, unlocks: verified-badge)
- verified-badge (dependsOn: profile-verification, unlocks: trust-score)
- block-report (dependsOn: messaging, unlocks: safety-center)

**Tier 7: Philosophy (8 chips — see Section 4)**

### 3.10 Travel

**Tier 0: Registration (3 chips)**
- email-signup (dependsOn: [], unlocks: traveler-profile)
- oauth-signup (dependsOn: [], unlocks: traveler-profile)
- traveler-profile (dependsOn: email-signup, oauth-signup, unlocks: preferences, saved-trips)

**Tier 1: Setup (4 chips)**
- preferences (dependsOn: traveler-profile, unlocks: search)
- saved-trips (dependsOn: traveler-profile, unlocks: trip-planner)
- payment-methods (dependsOn: traveler-profile, unlocks: booking)
- traveler-documents (dependsOn: traveler-profile, unlocks: visa-checks)

**Tier 2: Core Travel (5 chips)**
- search (dependsOn: preferences, unlocks: filters, results, map-view)
- filters (dependsOn: search, unlocks: price-alerts)
- results (dependsOn: search, unlocks: compare, booking)
- map-view (dependsOn: search, unlocks: nearby-explore)
- trip-planner (dependsOn: saved-trips, unlocks: itinerary)

**Tier 3: Engagement (4 chips)**
- booking (dependsOn: results, payment-methods, unlocks: confirmation, itinerary)
- itinerary (dependsOn: trip-planner, booking, unlocks: day-planner)
- reviews (dependsOn: booking, unlocks: ratings)
- price-alerts (dependsOn: filters, unlocks: best-time-to-buy)

**Tier 4: Monetization (4 chips)**
- booking-fees (dependsOn: booking, unlocks: loyalty-program)
- loyalty-program (dependsOn: booking-fees, unlocks: points, upgrades)
- premium-membership (dependsOn: booking, unlocks: perks, lounge-access)
- partner-deals (dependsOn: booking, unlocks: package-deals)

**Tier 5: Advanced (4 chips)**
- day-planner (dependsOn: itinerary, unlocks: recommendations)
- nearby-explore (dependsOn: map-view, unlocks: local-tips)
- travel-insurance (dependsOn: booking, unlocks: coverage-details)
- visa-checks (dependsOn: traveler-documents, unlocks: document-reminders)

**Tier 6: Social (3 chips)**
- share-trip (dependsOn: itinerary, unlocks: collaborative-planning)
- collaborative-planning (dependsOn: share-trip, unlocks: group-booking)
- travel-feed (dependsOn: reviews, unlocks: influencer-content)

**Tier 7: Philosophy (8 chips — see Section 4)**

### 3.11 Real Estate

**Tier 0: Registration (3 chips)**
- email-signup (dependsOn: [], unlocks: user-profile)
- oauth-signup (dependsOn: [], unlocks: user-profile)
- user-profile (dependsOn: email-signup, oauth-signup, unlocks: saved-searches, favorites)

**Tier 1: Setup (4 chips)**
- buyer-preferences (dependsOn: user-profile, unlocks: property-search)
- agent-signup (dependsOn: user-profile, unlocks: agent-profile, listing-management)
- saved-searches (dependsOn: user-profile, unlocks: search-alerts)
- mortgage-preapproval (dependsOn: user-profile, unlocks: affordability-calc)

**Tier 2: Core Listings (5 chips)**
- property-search (dependsOn: buyer-preferences, unlocks: filters, map-view, property-detail)
- filters (dependsOn: property-search, unlocks: advanced-search)
- property-detail (dependsOn: property-search, unlocks: contact-agent, tour-scheduling)
- map-view (dependsOn: property-search, unlocks: neighborhood-info)
- agent-profile (dependsOn: agent-signup, unlocks: agent-contact)

**Tier 3: Engagement (4 chips)**
- favorites (dependsOn: user-profile, unlocks: compare, notifications)
- tour-scheduling (dependsOn: property-detail, unlocks: calendar-view)
- search-alerts (dependsOn: saved-searches, unlocks: push-notifications)
- contact-agent (dependsOn: property-detail, unlocks: messaging)

**Tier 4: Monetization (4 chips)**
- featured-listings (dependsOn: agent-profile, unlocks: promoted-properties)
- promoted-properties (dependsOn: featured-listings, unlocks: analytics)
- premium-agent-tier (dependsOn: agent-profile, unlocks: lead-generation)
- lead-generation (dependsOn: premium-agent-tier, unlocks: lead-tracking)

**Tier 5: Advanced (4 chips)**
- neighborhood-info (dependsOn: map-view, unlocks: school-ratings, commute-times)
- affordability-calc (dependsOn: mortgage-preapproval, unlocks: monthly-payment-est)
- compare (dependsOn: favorites, unlocks: side-by-side)
- listing-management (dependsOn: agent-signup, unlocks: analytics)

**Tier 6: Trust (3 chips)**
- agent-verification (dependsOn: agent-profile, unlocks: verified-badge)
- verified-badge (dependsOn: agent-verification, unlocks: trust-score)
- reviews (dependsOn: contact-agent, unlocks: agent-ratings)

**Tier 7: Philosophy (8 chips — see Section 4)**

### 3.12 Education

**Tier 0: Registration (3 chips)**
- email-signup (dependsOn: [], unlocks: learner-profile)
- oauth-signup (dependsOn: [], unlocks: learner-profile)
- learner-profile (dependsOn: email-signup, oauth-signup, unlocks: interests, dashboard)

**Tier 1: Setup (4 chips)**
- interests (dependsOn: learner-profile, unlocks: course-recommendations)
- dashboard (dependsOn: learner-profile, unlocks: progress, enrolled-courses)
- payment-setup (dependsOn: learner-profile, unlocks: course-purchase)
- instructor-signup (dependsOn: oauth-signup, unlocks: instructor-profile, course-creation)

**Tier 2: Core Learning (5 chips)**
- course-recommendations (dependsOn: interests, unlocks: catalog-browse, search)
- catalog-browse (dependsOn: course-recommendations, unlocks: course-detail)
- course-detail (dependsOn: catalog-browse, unlocks: enroll, reviews)
- search (dependsOn: course-recommendations, unlocks: filters)
- enroll (dependsOn: course-detail, payment-setup, unlocks: lessons, progress)

**Tier 3: Engagement (4 chips)**
- lessons (dependsOn: enroll, unlocks: quizzes, assignments)
- progress (dependsOn: enroll, unlocks: achievements, certificates)
- quizzes (dependsOn: lessons, unlocks: scores, feedback)
- assignments (dependsOn: lessons, unlocks: submissions, grades)

**Tier 4: Monetization (4 chips)**
- course-purchase (dependsOn: payment-setup, unlocks: subscription-models)
- subscription-models (dependsOn: course-purchase, unlocks: bundle-deals)
- bundle-deals (dependsOn: subscription-models, unlocks: learning-paths)
- instructor-revenue (dependsOn: course-purchase, unlocks: payout-system)

**Tier 5: Advanced (4 chips)**
- instructor-profile (dependsOn: instructor-signup, unlocks: bio, course-list)
- course-creation (dependsOn: instructor-signup, unlocks: lesson-builder, publishing)
- lesson-builder (dependsOn: course-creation, unlocks: multimedia, assessments)
- certificates (dependsOn: progress, unlocks: shareable-credentials)

**Tier 6: Community (3 chips)**
- discussions (dependsOn: enroll, unlocks: q-and-a)
- q-and-a (dependsOn: discussions, unlocks: mentorship)
- study-groups (dependsOn: enroll, unlocks: collaborative-learning)

**Tier 7: Philosophy (8 chips — see Section 4)**

### 3.13 Gaming

**Tier 0: Registration (3 chips)**
- email-signup (dependsOn: [], unlocks: gamer-profile)
- oauth-connect (dependsOn: [], unlocks: gamer-profile)
- gamer-profile (dependsOn: email-signup, oauth-connect, unlocks: avatar, preferences)

**Tier 1: Setup (4 chips)**
- avatar (dependsOn: gamer-profile, unlocks: customization)
- preferences (dependsOn: gamer-profile, unlocks: difficulty, controls)
- friends-list (dependsOn: gamer-profile, unlocks: invites, party)
- device-setup (dependsOn: gamer-profile, unlocks: notifications, sync)

**Tier 2: Core Gameplay (5 chips)**
- tutorial (dependsOn: gamer-profile, unlocks: main-game)
- main-game (dependsOn: tutorial, unlocks: levels, scoring)
- levels (dependsOn: main-game, unlocks: progression, difficulty-curve)
- scoring (dependsOn: main-game, unlocks: leaderboards, achievements)
- in-game-store (dependsOn: main-game, unlocks: purchases)

**Tier 3: Engagement (4 chips)**
- achievements (dependsOn: scoring, unlocks: trophies)
- progression (dependsOn: levels, unlocks: skill-tree, prestige)
- daily-challenges (dependsOn: main-game, unlocks: rewards)
- notifications (dependsOn: device-setup, unlocks: friend-activity)

**Tier 4: Monetization (4 chips)**
- in-app-purchases (dependsOn: in-game-store, unlocks: consumables, cosmetics)
- battle-pass (dependsOn: progression, unlocks: seasonal-content)
- cosmetics (dependsOn: in-app-purchases, unlocks: skin-market)
- consumables (dependsOn: in-app-purchases, unlocks: boosts)

**Tier 5: Advanced (4 chips)**
- skill-tree (dependsOn: progression, unlocks: specializations)
- multiplayer (dependsOn: main-game, unlocks: matchmaking, party)
- matchmaking (dependsOn: multiplayer, unlocks: ranked-play)
- leaderboards (dependsOn: scoring, unlocks: seasons)

**Tier 6: Social (3 chips)**
- party (dependsOn: friends-list, multiplayer, unlocks: voice-chat)
- voice-chat (dependsOn: party, unlocks: team-communication)
- clans-guilds (dependsOn: party, unlocks: clan-events)

**Tier 7: Philosophy (8 chips — see Section 4)**

### 3.14 AI / LLM

**Tier 0: Registration (3 chips)**
- email-signup (dependsOn: [], unlocks: user-preferences)
- oauth-signup (dependsOn: [], unlocks: user-preferences)
- user-preferences (dependsOn: email-signup, oauth-signup, unlocks: session-management, api-key-setup)

**Tier 1: Setup (4 chips)**
- session-management (dependsOn: user-preferences, unlocks: conversation-history)
- api-key-setup (dependsOn: user-preferences, unlocks: model-selection, cost-tracking)
- model-selection (dependsOn: api-key-setup, unlocks: model-config)
- usage-limits (dependsOn: api-key-setup, unlocks: rate-limiting)

**Tier 2: Core AI (5 chips)**
- conversation-interface (dependsOn: session-management, unlocks: streaming, context)
- prompt-input (dependsOn: conversation-interface, unlocks: file-upload, multi-modal)
- streaming (dependsOn: conversation-interface, unlocks: real-time-response)
- context-management (dependsOn: conversation-interface, unlocks: memory, system-prompts)
- model-config (dependsOn: model-selection, unlocks: temperature, max-tokens, top-p)

**Tier 3: Engagement (4 chips)**
- conversation-history (dependsOn: session-management, unlocks: search, export)
- search-history (dependsOn: conversation-history, unlocks: semantic-search)
- favorites-saved (dependsOn: conversation-history, unlocks: collections)
- export (dependsOn: conversation-history, unlocks: share)

**Tier 4: Monetization (4 chips)**
- token-metering (dependsOn: usage-limits, unlocks: pay-per-use)
- pay-per-use (dependsOn: token-metering, unlocks: subscription-plans)
- subscription-plans (dependsOn: pay-per-use, unlocks: tiered-access)
- custom-models (dependsOn: model-selection, unlocks: fine-tuning)

**Tier 5: Advanced (4 chips)**
- fine-tuning (dependsOn: custom-models, unlocks: knowledge-base, embeddings)
- knowledge-base (dependsOn: fine-tuning, unlocks: rag, document-qa)
- rag-implementation (dependsOn: knowledge-base, unlocks: citation)
- embeddings (dependsOn: fine-tuning, unlocks: similarity-search)

**Tier 6: Tool Use (3 chips)**
- function-calling (dependsOn: conversation-interface, unlocks: tool-integration)
- tool-integration (dependsOn: function-calling, unlocks: web-search, code-execution)
- multi-agent (dependsOn: tool-integration, unlocks: agent-orchestration)

**Tier 7: Philosophy (8 chips — see Section 4)**

---

## SECTION 4: App Philosophy Tier

The Philosophy tier (Tier 7) contains cross-cutting principles that apply to every chip in the app. These are not standalone features — they are design constraints woven into every tier.

Each principle should specify:
- What it means specifically for this app type
- Common approaches
- What competitors miss

### 4.1 Security & Privacy

**What it means:** How user data is protected at rest, in transit, and during processing. How access control works. How breaches are handled.

**Common approaches:**
- HTTPS everywhere, CSP headers, encrypted storage
- OWASP top-10 prevention (XSS, CSRF, SQL injection)
- Row-level security in database
- Regular dependency auditing (npm audit, snyk)

**Competitors often miss:**
- Granular permission controls (not just "all or nothing")
- Data export/deletion for GDPR compliance
- Rate limiting on sensitive endpoints (auth, password reset)
- Audit logging of admin actions

### 4.2 Accessibility

**What it means:** Can users with disabilities fully use the app? Screen reader support, keyboard navigation, color contrast, text scaling.

**Common approaches:**
- WCAG 2.1 AA compliance targets
- Semantic HTML / accessibility labels
- Keyboard navigation with visible focus indicators
- Sufficient color contrast (4.5:1 ratio)

**Competitors often miss:**
- Testing with real assistive technology (not just automated checks)
- Motion reduction support for vestibular disorders
- Font scaling that doesnt break layouts
- Voice control compatibility

### 4.3 Offline / Resilience

**What it means:** What happens when the network disappears. Can users still access the app? Do they lose data?

**Common approaches:**
- Service workers for asset caching
- IndexedDB for local data persistence
- Optimistic UI updates with queue
- Connection status indicators

**Competitors often miss:**
- Conflict resolution when offline edits conflict with server state
- Meaningful offline mode (not just a "no connection" error screen)
- Background sync when connection returns
- Partial offline support for previously viewed content

### 4.4 Performance

**What it means:** How fast does the app load and respond. Bundle size, render performance, API latency, perceived speed.

**Common approaches:**
- Code splitting and lazy loading
- Image optimization (WebP, AVIF, responsive sizes)
- Skeleton screens for perceived performance
- Memoization and virtualization for lists

**Competitors often miss:**
- Performance budgets with CI enforcement
- Core Web Vitals monitoring (LCP, FID, CLS)
- Optimistic UI that updates before server confirms
- Cold start performance (not just warm cache)

### 4.5 Onboarding Experience

**What it means:** How new users go from signup to "aha moment." Walkthroughs, progressive disclosure, empty states.

**Common approaches:**
- Progressive onboarding (ask for permissions when needed, not all at once)
- Sample data to demonstrate features
- Tooltip guides for first-time users

**Competitors often miss:**
- Personalized onboarding based on user goals (asked during signup)
- Skippable tutorials that dont punish skipping
- Re-activation flows for users who churned
- Onboarding that adapts to user behavior, not linear

### 4.6 Error Handling

**What it means:** What users see when something breaks. Error messages, recovery paths, logging, monitoring.

**Common approaches:**
- Error boundaries in React/Next.js
- User-friendly error messages (no stack traces)
- Retry logic for transient failures
- Logging and monitoring (Sentry, PostHog)

**Competitors often miss:**
- Actionable error messages (tell user what to do, not just what went wrong)
- Offline detection that preemptively explains limited functionality
- Crash dumps/way to report errors in-app
- Graceful degradation (core features work even when complex ones fail)

### 4.7 Notifications

**What it means:** How the app communicates with users outside the app. Push, email, in-app, digest.

**Common approaches:**
- Firebase Cloud Messaging for push
- Resend/SendGrid for email
- In-app notification center
- Preference center (what, when, where)

**Competitors often miss:**
- Notification grouping (dont send 5 separate alerts for 5 likes)
- Scheduled digests for non-urgent updates
- Quiet hours / do-not-disturb per user timezone
- Actionable notifications (reply from notification, mark done from notification)

### 4.8 Theming

**What it means:** Visual customization. Dark mode, custom color schemes, font size adjustment, high contrast.

**Common approaches:**
- CSS custom properties for theming
- System preference detection (prefers-color-scheme)
- Persisted theme choice (localStorage)
- Consistent spacing/token system

**Competitors often miss:**
- Per-element theme overrides (not just dark/light toggle)
- High contrast mode specifically (separate from dark mode)
- Reduced motion for animations
- Custom accent colors that meet accessibility contrast
- OLED dark mode (pure black backgrounds for battery saving)

---

## SECTION 5: Output Format Spec

### Visual Template

```
┌── /chips <app-type> ──────────────────────────────────┐
│                                                        │
│  TIER 0: Registration                 NEXT → <id>     │
│  <status> <chip-id>             <library> + <purpose> │
│  <status> <chip-id>             <library> + <purpose> │
│                                                        │
│  TIER 1: <Tier Name>                                  │
│  <status> <chip-id>  (needs <dep-id>)                  │
│                                                        │
│  TIER 2: <Tier Name>                                  │
│  <status> <chip-id>             <library>              │
│                                                        │
│  ...                                                   │
│                                                        │
│  TIER 7: Philosophy                                    │
│  ◻ security-first-design                               │
│  ◻ accessibility-by-default                            │
│  ◻ offline-resilience                                  │
│  ◻ performance-optimized                               │
│  ◻ onboarding-flow                                     │
│  ◻ error-handling                                      │
│  ◻ notification-system                                 │
│  ◻ theming-system                                      │
│                                                        │
│  ───────────────────────────────────────────────       │
│  NEXT: <chip-id> (<Tier N>) — <why it's next>         │
│  Total: <pending>/<ready>/<in-progress>/<completed>    │
└────────────────────────────────────────────────────────┘
```

### Real Example for Banking:

```
┌── /chips bank app ────────────────────────────────────┐
│                                                        │
│  TIER 0: Registration                NEXT → email     │
│  ➡ email-password     next-auth — managed auth + OAuth│
│  ◻ phone-verification  twilio/termii — SMS OTP        │
│  ◻ kyc-verification    webcam.js + jumio — doc scan   │
│  ◻ biometric-setup     expo-local-auth — fingerprint  │
│                                                        │
│  TIER 1: Accounts                                      │
│  ⏳ checking-account  (needs kyc-verification)         │
│  ◻ savings-account    (needs kyc-verification)         │
│  ◻ fast-auth          (needs biometric-setup)          │
│                                                        │
│  TIER 2: Core Financial                                │
│  ◻ deposits                                            │
│  ◻ transfers                                           │
│  ◻ transaction-history                                 │
│  ◻ bill-pay                                            │
│  ◻ savings-goals                                       │
│                                                        │
│  TIER 3: Engagement                                    │
│  ◻ spending-insights  (needs transaction-history)      │
│  ◻ budgeting           (needs spending-insights)       │
│  ◻ notifications                                       │
│  ◻ recurring-payments  (needs transfers, bill-pay)    │
│                                                        │
│  TIER 4: Monetization                                  │
│  ◻ subscription-plans  stripe + lemon squeezy          │
│  ◻ premium-features    (needs subscription-plans)      │
│  ◻ instant-payments    (needs fast-auth)               │
│  ◻ international-xfer  wise API + OFX plugin           │
│                                                        │
│  TIER 5: Advanced                                      │
│  ◻ investment-account  (needs premium-features)        │
│  ◻ portfolio-tracking  plaid + yahoo-finance API       │
│  ◻ credit-score-mon    (needs kyc-verification)        │
│                                                        │
│  TIER 6: Social                                        │
│  ◻ peer-to-peer        (needs instant-payments)        │
│  ◻ request-money       (needs peer-to-peer)            │
│  ◻ split-bill          (needs peer-to-peer)            │
│                                                        │
│  TIER 7: Philosophy                                    │
│  ◻ security-first-design                               │
│  ◻ accessibility-by-default                            │
│  ◻ offline-resilience                                  │
│  ◻ performance-optimized                               │
│  ◻ onboarding-flow                                     │
│  ◻ error-handling                                      │
│  ◻ notification-system                                 │
│  ◻ theming-system                                      │
│                                                        │
│  ───────────────────────────────────────────────       │
│  NEXT: email-password (Tier 0) — foundation for all    │
│  status: 0/0/0/0 — 0 completed                         │
└────────────────────────────────────────────────────────┘
```

### Status Symbols

| Symbol | Meaning | Condition |
|--------|---------|-----------|
| ✅ | Completed | Chip is finished |
| 🔄 | In Progress | Chip is being worked on |
| ◻ | Pending | Chip not started, deps may not be met |
| ⏳ | Ready | Pending but all deps are met |
| ➡ | Next | Recommended next to work on |

### Status Count Display

Format: `status: X/Y/Z/W — N completed`
Where: X=pending, Y=ready, Z=in-progress, W=completed

### Dependency Notation

When a chip has unmet dependencies, show:
```
<status> <chip-id>  (needs <dep1>, <dep2>)
```

Truncate to 2 dependency names if there are more, appending ":"

### Chip Display Width

Chip IDs are max 24 characters. Truncate with "…" if longer.
Library names are abbreviated to fit — full details in status file.

---

## SECTION 6: Tool Instructions

### 6.1 Competitor Analysis with `websearch_web_search_exa`

Use `websearch_web_search_exa` to research real competitors for each chip. Query patterns:

**Competitor discovery:**
- `"top [domain] apps [year]"` — discover major players
- `"best [app type] app for [feature]"` — feature-specific competitors
- `"[domain] app comparison [year]"` — head-to-head comparisons

**Feature validation:**
- `"how [competitor] handles [feature]"` — understand competitor implementation
- `"[competitor] vs [competitor2] [feature]"` — feature comparison

**Competitor analysis per chip:**
For each chip, search for apps in the same domain and note:
- How they handle the feature
- What their UX pattern looks like
- Pricing model for the feature (free, premium, etc.)

**Source labeling:** Every competitor claim must include the app name as the source. Example: `source: Mint — uses Plaid for bank sync`

### 6.2 Library Recommendations with `grep_app_searchGitHub`

Use `grep_app_searchGitHub` to find real usage examples of libraries you recommend.

**Library validation pattern:**
- `"import [library]"` — find import patterns in real repos
- `"[library] setup"` — find configuration examples
- `"[library] + [framework]"` — framework integration examples

**Search parameters:**
- language: Match the stack (TypeScript, TSX for React, Python for Django, etc.)
- Use regex when searching for patterns across multiple lines
- Look in high-star repos for authoritative usage

**Library recommendation format:**
```
library-name — one-liner purpose — alternative: alt-name (trade-off in one sentence)
```

### 6.3 Supplementing Data with `webfetch`

Use `webfetch` to:
- Get pricing pages for competitor apps
- Read library documentation and README files
- Fetch landing pages for differentiation ideas

### 6.4 Source Discipline

ALL competitor claims MUST cite a source. Valid sources:
- An app name with a note about how you know: `source: Chime — known for instant account opening`
- From a search result: `source: [app name] — per web search "top neobank apps"`
- From documentation: `source: [library name] — per README.md`

Never make up competitor claims. If you cannot find a source, note: "could not find competitor data for [feature]"

---

## SECTION 7: Guardrails

### 7.1 No Code Generation

The `/chips` command produces plans, architecture, and recommendations only. It MUST NOT:
- Generate any source code (components, functions, pages)
- Generate configuration files (except `.chips/status.json`)
- Generate test files
- Generate SQL, GraphQL, or API route definitions
- Provide code snippets as part of library recommendations (library names are fine)

If the user asks for code generation: "I can only map features and recommend libraries. To generate code, use the appropriate command or agent."

### 7.2 File System Boundaries

Writing/modifying files is limited to:
- `.chips/status.json` in the project root
- `.chips/status.json.bak` (backup on --force overwrite)

MUST NOT modify:
- Any source code files
- Configuration files (package.json, tsconfig, etc.)
- Any file outside `.chips/` directory

### 7.3 Source Citation Requirement

Every competitor claim must include a source. The source can be:
- An app name with brief context: `source: Revolut — known for multi-currency accounts`
- A search-derived finding: `source: per search for "top budgeting apps 2025"`

MUST NOT make unsourced competitor claims. If search is unavailable, note the limitation.

### 7.4 Library Recommendation Constraints

Every library recommendation must include:
- Library name
- One-sentence purpose
- At least one trade-off alternative

Example: `zod — runtime schema validation with TS inference — alternative: yup (more mature, heavier bundle, less TS-native)`

### 7.5 Chip Count Limits

Total top-level chips across all tiers: minimum 5, maximum 12. This ensures the map is detailed enough to be useful but focused enough to avoid overwhelming.

Philosophy tier chips are not counted in this limit (they always number 8 and are standard).

### 7.6 Differentiation Must Be Concrete

Differentiation statements must be specific and verifiable. They must describe a real advantage.

**Acceptable:** "Supports offline-first sync using IndexedDB queue so users in areas with spotty connectivity never lose data"
**Acceptable:** "On-device ML classification of transactions means user financial data never leaves their phone"
**NOT acceptable:** "Better user experience"
**NOT acceptable:** "Industry-leading performance"
**NOT acceptable:** "Robust and scalable architecture"

### 7.7 No Hallucinated App Details

The chip map describes features at a high level. It MUST NOT include:
- Specific API endpoint paths: `POST /api/users/register`
- Database table or field names: `users table with email field`
- Component names: `UserRegistrationForm.tsx`
- File paths: `src/features/auth/`
- State variable names: `isLoading, setUser`

These details depend on the actual implementation and cannot be determined from a feature map alone.

### 7.8 No Scope Expansion

If the user requests features outside the chip mapping scope:
- Jira/Linear integration → "Out of scope. This command maps app features only."
- Web dashboard for chips → "Out of scope. Output is terminal-only."
- Multi-user progress → "Out of scope. Progress is local only."
- Auto-audit of existing code → "Out of scope. Chips are forward-looking only."
- PRD generation → "Out of scope. Feature maps do not generate PRDs."

---

## SECTION 8: Error Handling

### 8.1 No Arguments Provided

If `$ARGUMENTS` is empty after `/chips`:

```
USAGE: /chips <app-type> [--force] [--resume] [--done <id>] [--start <id>] [--reset]

Examples:
  /chips bank app           Map features for a banking/fintech app
  /chips social media       Map features for a social network app
  /chips e-commerce         Map features for an online store

Available domains:
  banking, social, e-commerce, saas, marketplace, food-delivery,
  health-fitness, productivity, dating, travel, real-estate,
  education, gaming, ai-llm

Flags:
  --force      Overwrite existing progress without asking
  --resume     Resume from existing progress without asking
  --done <id>  Mark a chip as completed
  --start <id> Mark a chip as in-progress
  --reset      Clear all progress

Need help? Describe what you're building and I'll suggest the best domain.
```

### 8.2 Unknown Domain

If the app type doesn't match any domain template:

```
I don't have a pre-built template for "[raw input]". Available domains:

  banking, social, e-commerce, saas, marketplace, food-delivery,
  health-fitness, productivity, dating, travel, real-estate,
  education, gaming, ai-llm

I can also build a custom template from scratch. To help me
understand your app, answer these questions:

1. Who are the primary users? (consumers, businesses, both)
2. What is the core action users take?
3. Is there a financial exchange? (payments, subscriptions, free)
4. Is there real-time communication or matching between users?
5. Does this app rely on user-generated or curated content?
```

Collect answers and generate a generic template using the standard 8-tier structure (Registration → Setup → Core → Engagement → Monetization → Advanced → Social → Philosophy).

### 8.3 Offline Mode (No Web Search Available)

If `websearch_web_search_exa` is unavailable:

```
INFO: Web search is unavailable — working in offline mode.
Competitor analysis will use cached knowledge.
Differentiation suggestions may be less current.
Library recommendations are based on general knowledge.
```

Proceed with cached competitor knowledge and standard library recommendations. Append a disclaimer to every differentiation.

### 8.4 Corrupted `.chips/status.json`

If `.chips/status.json` exists but is not valid JSON:

```
WARNING: .chips/status.json is corrupted or unparseable.
  - Use --reset to overwrite with fresh data
  - Or manually fix the file
  - Or delete it to start clean
```

### 8.5 No Project Context

If executed from a home directory (no `package.json`, `app.json`, or similar project marker found):

```
NOTE: Not in a project directory. Feature mapping will work but
progress won't be saved (.chips/status.json requires a project root).
```

Proceed with in-memory only (no persistence). Print chip map to terminal but skip file operations.

---

## SECTION 9: File Format

### YAML Frontmatter

The command file uses YAML frontmatter for OpenCode command registration:

```yaml
---
description: Smart app feature flow mapper — signup → features → philosophy
agent: Prometheus
model: deepseek/deepseek-v4-pro
---
```

### Argument Reference

- `$ARGUMENTS` — the complete text the user typed after `/chips`. The command parses this into app type and flags.

### File Location

- Command file: `~/.opencode/commands/chips.md`
- Status file: `.chips/status.json` (relative to project root)

### Status File Schema

```json
{
  "appType": "string",
  "version": "number (integer, starts at 1)",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp",
  "tiers": [
    {
      "tier": "number (0-7)",
      "name": "string",
      "chips": [
        {
          "id": "string (kebab-case)",
          "label": "string (short description)",
          "status": "string ('pending' | 'ready' | 'in-progress' | 'completed')",
          "dependsOn": ["string (chip ids)"],
          "unlocks": ["string (chip ids)"],
          "tech": {
            "library": "string",
            "purpose": "string",
            "alternative": "string"
          },
          "competitors": ["string (source-labeled)"],
          "differentiation": ["string (concrete)"]
        }
      ]
    }
  ]
}
```

### Status Lifecycle

```
◻ pending ──(deps met)──> ⏳ ready ──(user starts)──> 🔄 in-progress ──(user finishes)──> ✅ completed
                                                                                              │
                                                                                              └── (unlocks downstream chips from pending to ready)
```

---

## Execution Flow Summary

```
┌─────────────────────────────────────────────────────────┐
│  /chips <app-type>                                      │
│                                                         │
│  1. Parse $ARGUMENTS → extract app type + flags         │
│  2. Match domain template (14 available)                │
│     - Unknown? Ask 3-5 discovery questions              │
│  3. Check .chips/status.json                            │
│     - Exists + no flags? → ask overwrite/resume/cancel  │
│     - --force → overwrite (backup old)                  │
│     - --resume → skip prompt, resume                    │
│     - Corrupted? → warn, offer --reset                  │
│  4. Generate feature dependency tree                    │
│     5-8 tiers, 5-12 chips total                         │
│     Per chip: status, tech, competitors, diff           │
│  5. Determine NEXT chip                                 │
│     Lowest tier with all deps met                       │
│  6. Output formatted chip map (Section 5)               │
│  7. Handle --done/--start/--reset flags if present      │
│  8. Persist to .chips/status.json                       │
└─────────────────────────────────────────────────────────┘
```
