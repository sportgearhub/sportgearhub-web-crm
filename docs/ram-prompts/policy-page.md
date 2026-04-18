# Policy Page RAM Prompt

## Route
`/policy`

## Purpose
Configure provider policies for cancellations, deposits, damage deposit, and late-return behavior.

## Current Layout
- Header and explanation
- Prototype banner
- One card per provider policy

## Per-Policy Card
- Policy label
- Updated date
- Edit button
- Two-column content layout:
  - Cancellation
  - Deposits & Fees
- Additional notes section at bottom

## Editable Fields
- Cancellation window hours
- Cancellation refund percent
- Deposit required toggle
- Deposit percent
- Damage deposit required toggle
- Late return fee enabled toggle
- Additional notes text

## Edit Behavior
- Inline edit mode per card
- Save and cancel controls
- Toggle switches are button-based in edit mode

## Current Data Source
- Local mock provider policies

## UX Character
- Policy admin page
- Card-based and structured by rule category
