# Fulfillment Page RAM Prompt

## Route
`/fulfillment`

## Purpose
Track operational fulfillment tasks for active rentals: handover, return, completion, and issue reporting.

## Current Layout
- Page header and short explanation
- Prototype banner explaining local-state workflow
- Success message banner after an action completes
- Two sections:
  - Open Queue
  - Completed / Issues

## Open Queue
- Shows bookings in `pending_handover`, `active`, or `pending_return`
- Each card shows:
  - booking ref
  - status badge
  - customer and offer
  - resource and variant
  - start date/time
  - optional notes
- Actions depend on status:
  - record handover
  - record return
  - complete booking
  - report issue

## Completed / Issues
- Shows completed bookings and issue-reported items
- Same card style, compact mode
- No action buttons

## Action Flow
- Selecting an action opens a focused form screen for the selected booking
- Supported forms:
  - Handover
  - Return
  - Complete
  - Issue report
- After submit:
  - queue item is updated in local state
  - success banner appears
  - page returns to queue view

## Current Data Source
- Local mock fulfillment queue

## UX Character
- Operational workflow page
- More action-oriented than analytical
