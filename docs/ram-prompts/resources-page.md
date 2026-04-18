# Resource Catalog RAM Prompt

## Route
`/resources`

## Role
You are a senior marketplace product designer and frontend architect working on a rental equipment platform.

## Context
Design and implement a high-performance Resource Catalog page used by providers to manage rentable inventory.

This page is not a simple CRUD list.
It must behave like a commercial inventory control center.

## Core Objective
Transform the resource catalog so providers can:
- understand availability and inventory status instantly
- manage pricing and variants efficiently
- identify issues preventing bookings
- take fast actions across multiple resources
- optimize listings for conversion and revenue

## Product Principles
- Inventory-first, not content-first
- High signal density, low cognitive load
- Actionable at a glance
- Scalable to 500+ resources
- Optimized for speed with bulk and inline actions

## Primary View
Use an enhanced data table as the default view.

### Required Columns
- Resource
  - thumbnail or fallback initial
  - title
  - slug as secondary text
  - inline metadata:
    - variant count
    - base price preview such as `from €25/day`
- Category
- Price
  - base price or price range across variants
- Availability
  - examples:
    - `8 / 10 available`
    - `Fully booked`
    - `No stock`
  - must support future real-time updates
- Variants
  - count with compact indicator such as `3 variants`
- Status
  - Draft
  - Active
  - Inactive
- Health
  - completeness score or readiness state
  - examples:
    - `80% complete`
    - `Ready`
    - `Missing pricing`
    - `Missing variants`
    - `Missing images`
- Performance
  - future-ready placeholder for bookings and revenue
- Updated
- Actions
  - View
  - Edit
  - Archive
  - Duplicate

## Resource Cell Requirements
Each resource row must quickly communicate:
- what the resource is
- how ready it is to sell
- its commercial value

Include:
- image
- title
- category tag
- variant count
- price preview

## Filtering And Navigation
Replace simple filtering with multi-dimensional filtering.

### Filters
- Search by title and category
- Status:
  - active
  - draft
  - inactive
- Category
- Availability:
  - available
  - partially booked
  - fully booked
  - no stock
- Health:
  - needs attention
  - ready

### Quick Tabs
- All
- Active
- Draft
- Needs attention
- Out of stock

## Bulk Actions
Allow multi-select rows.

### Bulk Action Bar
- Activate / Deactivate
- Archive
- Assign category
- Duplicate

## Inline Speed Actions
Support fast in-table actions:
- toggle active / inactive directly in table
- quick edit for title and category
- hover-revealed action controls where appropriate

## Create Flow
Split create into two entry paths.

### Quick Create
- title
- category
- save directly as Draft

### Guided Setup
Step-based flow:
1. Basics
2. Variants
3. Pricing
4. Availability
5. Media

Requirements:
- visible progress indicator
- validation per step

## Detail View
Upgrade the resource detail experience to include:
- variants list with:
  - stock
  - price
- pricing overview
- availability preview with calendar-ready placeholder
- edit action
- archive action

## Empty States
Use meaningful business-oriented empty states.

Instead of:
> No resources

Use:
> Add your first rental resource. Listings with pricing and availability perform significantly better.

## Data Model Requirements
Frontend should be compatible with the following model.

### Resource
- `id`
- `title`
- `slug`
- `category`
- `status`
- `images`
- `updated_at`

### Variants
- `id`
- `resource_id`
- `name`
- `price`
- `stock_total`
- `stock_available`

### Derived Fields
- `base_price`
- `availability_ratio`
- `completeness_score`

## Future-Proofing
Design must support:
- API integration replacing mocks
- real-time availability updates
- performance metrics such as bookings and revenue
- sorting by:
  - price
  - performance
  - availability

## UX Expectations
- fast scanning with excellent table readability
- minimal clicks for common actions
- clear visual hierarchy
- no dead-end states
- responsive desktop-first behavior with tablet support

## Deliverables
Produce:
1. component architecture
2. table layout structure
3. state management approach
4. sample data mapping
5. interaction patterns for hover, select, and inline edit
6. empty and loading states

## Anti-Patterns
Avoid:
- treating resources like static CMS entries
- hiding pricing or availability
- overusing modals
- forcing full-page navigation for small edits
- omitting bulk operations

## Success Criteria
The page succeeds if a provider can:
- identify which resources are not rentable
- fix issues quickly
- understand availability instantly
- manage many resources efficiently
- improve listing quality without extra guidance

## Tone
Professional, efficient, operational.

Prioritize clarity, speed, and business impact over decorative UI.
