# Variants Page RAM Prompt

## Route
`/variants`

## Purpose
Manage resource variants in a compact table suitable for larger catalogs.

## Current Layout
- Header with filtered row count, low-stock count, and total count
- Add button
- Toolbar with:
  - text search
  - resource filter
  - status filter
- Horizontally scrollable variants table

## Table Design
- Sticky first column for Variant
- Dense CRM-like row presentation
- Built for large numbers of variants

## Current Columns
- Variant
- Resource
- SKU
- Attributes
- Stock
- Status
- Order
- Actions

## Row Features
- Variant title and internal id
- Resource name lookup
- SKU shown in monospace style
- Attributes rendered as compact tags
- Low stock highlighted when stock is 2 or below
- Status badge for active/inactive
- Inline order up/down controls
- Inline edit and activation toggle controls

## Filtering
- Search matches title, SKU, resource title, and attribute text
- Resource filter narrows by resource id
- Status filter narrows by active/inactive

## Create/Edit Flow
- Modal form
- Fields:
  - resource
  - title
  - SKU
  - stock
  - one attribute key/value pair

## Current Data Source
- Local mock variants and resources

## UX Character
- Dense operational table
- Suitable for managing 100+ variants better than cards
