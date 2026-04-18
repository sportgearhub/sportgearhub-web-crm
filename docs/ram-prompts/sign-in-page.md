# Sign In Page RAM Prompt

## Route
Unauthenticated entry screen

## Purpose
Allow partner users to sign in to the Sportgearhub CRM.

## Current Layout
- Centered single-column auth card
- Brand mark at top with mountain icon and Sportgearhub title
- White sign-in panel on light gray background

## Main Elements
- Email input with icon
- Password input with icon
- Primary sign in button
- Inline error alert for missing fields or sign-in failure
- OAuth section with Google and Yandex buttons
- Partner-only access note below card

## Current Behavior
- Validates that email and password are present
- Calls local `signIn(email, password)` auth handler
- Shows loading state while signing in
- If auth succeeds, app moves into CRM shell
- If auth fails, shows error message

## Tone
- Clean and simple
- Functional login page rather than marketing page
