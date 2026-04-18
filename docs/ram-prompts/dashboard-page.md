# Dashboard Page RAM Prompt

## Route
`/`

## Purpose
Give provider managers a quick overview of the current rental operation.

## Current Layout
- Greeting block with user first name, date, and provider name
- Four KPI cards in a responsive grid
- Two operational panels:
  - fulfillment queue
  - recent bookings
- Three secondary cards:
  - catalog readiness
  - open issues
  - quick navigation

## KPI Cards
- Active bookings
- Pending handovers
- Pending returns
- Revenue month to date

## Functional Panels
### Fulfillment Queue
- Shows pending handover and pending return items
- Each row includes customer, offer, and a status badge
- Clicking navigates to Fulfillment page

### Recent Bookings
- Shows latest booking rows
- Each row includes booking ref, booking status, customer, offer, and amount
- Clicking navigates to Bookings page

## Secondary Cards
### Catalog Readiness
- Percentage style readiness view
- CTA to manage resources

### Open Issues
- Shows current open issue count
- Highlights issue state if count is above zero
- CTA to fulfillment

### Quick Navigation
- Shortcut buttons to resources, offers, availability, pricing, and policy

## Current Data Source
- Local mock stats, bookings, and fulfillment queue

## UX Character
- Overview page
- Moderate card-based density
- Optimized for quick navigation rather than deep management
