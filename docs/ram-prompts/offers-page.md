# Offers Page RAM Prompt

## Route
`/offers`

## Purpose
Manage customer-facing rental offers in a compact table with CRUD-style detail and edit flows.

## Current Layout
- Header with filtered row count, ready count, and total offer count
- Add button
- Toolbar with:
  - text search
  - resource filter
  - status filter
- Wide offers table with horizontal scrolling

## Table Design
- Sticky first column for Offer
- Dense row layout
- Geared for scalable CRM usage

## Current Columns
- Offer
- Resource
- Price
- Duration
- Publishable
- Status
- Updated
- Actions

## Row Features
- Offer title and slug
- Resource title
- Price in RUB
- Duration value and duration unit
- Publishability summary:
  - Ready
  - blocker count
- Status badge
- Updated date
- View and edit actions

## Filtering
- Search matches offer title, resource title, and slug
- Resource filter narrows by resource id
- Status filter narrows by status

## View Modes
- List
- Detail
- Create
- Edit

## Detail Flow
- Uses `OfferDetail`
- Supports status changes and edit action

## Create/Edit Flow
- Uses `OfferForm`
- Can prefill selected resource in create mode

## Current Data Source
- Local mock offers and resources

## UX Character
- Commercial configuration page
- Denser and more scalable than earlier card-based version
