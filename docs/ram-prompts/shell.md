# Shell RAM Prompt

## Purpose
Describe the current global application shell for the Sportgearhub CRM.

## Current Structure
- Left sidebar navigation
- Top header bar
- Main content area that renders one page at a time

## Sidebar
- Dark green vertical sidebar
- Collapsible between compact and expanded widths
- Sticky to viewport height
- Only the navigation area scrolls when content exceeds screen height
- Contains:
  - brand area with Sportgearhub name
  - collapse/expand button
  - navigation buttons
  - nested menu groups for Catalog and Configuration
  - user info footer in expanded mode

## Header
- Flat white top bar
- Shows page title and subtitle
- Includes optional actions area
- Includes notification/help icon buttons
- Includes sign out button
- In large screens shows provider name and user email

## Main Content
- Single active page rendered according to current in-app route state
- Scrollable vertically
- Page content sits inside padded content sections

## Routes Currently Supported
- `/` Dashboard
- `/bookings`
- `/fulfillment`
- `/resources`
- `/variants`
- `/offers`
- `/availability`
- `/pricing`
- `/policy`
- `/reports`

## Interaction Notes
- Navigation is local state based, not URL-router based
- Sidebar active state is derived from current page path
- Sidebar can be collapsed without affecting page rendering
