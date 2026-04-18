# Bookings Page RAM Prompt

## Route
`/bookings`

## Purpose
Manage and inspect provider bookings with a dense CRM-style table and a calendar view.

## Current Layout
- Compact page header with row count and confirmed revenue
- Small KPI strip for pending, confirmed, and completed counts
- Toolbar with:
  - text search
  - status filter
  - column settings dropdown
  - table/calendar view toggle

## Table View
- Primary default view
- Horizontally scrollable wide table
- Sticky first column for booking reference
- Configurable visible columns

## Current Table Columns
- Ref
- Customer
- Offer
- Resource
- Start
- Duration
- Amount
- Status
- Open action

## Table Behavior
- Search matches ref, customer, offer, and resource
- Status filter narrows rows
- Column settings allow hiding/showing standard columns
- Row action opens booking detail screen

## Calendar View
- Month-based calendar grid
- 7-column weekday layout
- Prev/next month controls
- Each cell shows:
  - day number
  - booking count badge if present
  - compact booking chips with time, customer, and offer
- Clicking a booking opens detail

## Detail Flow
- Clicking a booking opens `BookingDetail`
- Back action returns to page list/calendar

## Current Data Source
- Local mock bookings

## UX Character
- Data-first
- Compact, scrollable, manager-oriented
- Built for high row counts better than card layouts
