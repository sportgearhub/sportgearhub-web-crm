# Pricing Page RAM Prompt

## Route
`/pricing`

## Purpose
Configure pricing policies and adjustment rules for offers/resources.

## Current Layout
- Header and explanation
- Prototype banner
- List of pricing policy cards
- Quote preview placeholder card at bottom

## Per-Policy Card
- Policy title
- Updated date
- Edit button
- Base price display/edit
- Adjustments list

## Adjustment Model
- Each adjustment contains:
  - label
  - type: percentage or fixed
  - amount
  - condition

## Edit Behavior
- Edit one policy at a time
- Save/cancel controls
- In edit mode user can:
  - change base price
  - add adjustment
  - edit adjustment label/type/amount
  - delete adjustment

## Non-Edit Mode
- Shows adjustments as compact rows with badge-style values

## Quote Preview
- Informational placeholder
- States that live quote simulation depends on API readiness

## Current Data Source
- Local mock pricing policies

## UX Character
- Configuration-focused
- Semi-structured policy editor
