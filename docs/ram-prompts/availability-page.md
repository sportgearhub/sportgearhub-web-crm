# Availability Page RAM Prompt

## Route
`/availability`

## Purpose
Configure scheduling constraints and booking windows for each resource.

## Current Layout
- Header and short explanation
- Prototype banner
- List of availability profile cards
- Extra section for resources without availability profile

## Per-Profile Card
- Resource title
- Updated date
- Edit button
- Editable fields:
  - booking horizon days
  - minimum advance booking hours
  - maximum advance booking days
  - default capacity

## Edit Behavior
- Inline edit mode per card
- Save and cancel controls
- Values update local page state only

## Additional Notes
- Non-edit mode shows a pending API note for calendar exceptions and blackout dates

## Unconfigured Resources Section
- Lists active resources missing an availability profile
- Shows simple “Not configured” badge

## Current Data Source
- Local mock availability profiles and resources

## UX Character
- Configuration screen
- Card-based and form-oriented
