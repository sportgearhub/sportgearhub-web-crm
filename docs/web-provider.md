# Sportgearhub Web Provider Console API Integration

This file is the working integration plan for `sportgearhub-web-provider-console`.

Use `sportgearhub-web-provider-console-prototype.md` as the product brief. Use this file for implementation order, endpoint wiring, and current checklist status.

## Current API Base Assumptions

- API authority is configured per environment by the web app.
- Provider web origin is configured per environment by the web app.
- Provider OIDC client id: `sportgearhub-provider-console`.
- Provider callback route: `/auth/callback`.
- Provider scopes: `openid profile email offline_access roles provider_api`.
- Cookie-based API calls must use browser credentials.
- Bearer-token API calls must use the OIDC access token.

API routes:

- Swagger: `/swagger`
- Health: `/health`
- Cities: `/api/v1/catalog/cities`
- Register: `/api/v1/auth/register`
- Login: `/api/v1/auth/login`
- Current user: `/api/v1/auth/me`
- Current provider memberships: `/api/v1/auth/provider-memberships`
- Dev email outbox: `/api/v1/development/emails`
- Provider onboarding options: `/api/v1/provider-onboarding/options`
- Current provider onboarding: `/api/v1/provider-onboarding/current`
- Provider locations: `/api/v1/provider/locations`
- OIDC authorize: `/connect/authorize`
- OIDC token: `/connect/token`
- OIDC userinfo: `/connect/userinfo`

Route prefix rule:

- Canonical frontend-facing API endpoints use `/api/v1/*`.
- Local auth endpoints use `/api/v1/auth/*`.
- Current provider memberships use `/api/v1/auth/provider-memberships`.
- Development helper endpoints use `/api/v1/development/*`.
- Provider onboarding endpoints use `/api/v1/provider-onboarding/*`.
- Provider console endpoints use `/api/v1/provider/*`.
- Legacy `/api/auth/*`, `/api/development/*`, and `/api/provider-console/*` aliases may exist temporarily, but new web code should not use them.

## Auth Model

The provider console has two user phases:

- pre-provider user: can register, verify email, sign in, and work through `/api/v1/provider-onboarding/*`
- provider member: can use `/api/v1/provider/*` after internal approval creates `Provider` and `ProviderMembership`

Do not grant provider access in frontend state. The API decides access from authenticated user, roles, scopes, and provider membership.

Use `/api/v1/auth/me` for signed-in user identity only. Use `/api/v1/auth/provider-memberships` to decide whether the user can enter a provider workspace or needs provider onboarding.

## Location Model

Location concepts are intentionally split:

- `registeredAddress`: legal registration address for onboarding, acquiring, payout, and compliance
- `city`: a catalog value used by provider operational locations and future marketplace filtering
- `provider location`: provider-owned pickup/service place, created after provider access exists

Do not model “Адрес точки выдачи” as onboarding legal identity. A provider can have multiple pickup/service places.

### Cities

```http
GET /api/v1/catalog/cities
```

Response:

```json
[
  {
    "cityId": "00000000-0000-0000-0000-000000000100",
    "countryCode": "RU",
    "region": "Свердловская область",
    "name": "Екатеринбург",
    "slug": "yekaterinburg",
    "timezone": "Asia/Yekaterinburg"
  }
]
```

### Provider Locations

```http
GET /api/v1/provider/locations
POST /api/v1/provider/locations
PATCH /api/v1/provider/locations/{locationId}
```

Create request:

```json
{
  "cityId": "00000000-0000-0000-0000-000000000100",
  "name": "Пункт выдачи на Ленина",
  "address": "ул. Ленина, 1",
  "type": "pickup",
  "isDefaultPickup": true,
  "description": null
}
```

Location response:

```json
{
  "locationId": "00000000-0000-0000-0000-000000000101",
  "providerId": "00000000-0000-0000-0000-000000000010",
  "cityId": "00000000-0000-0000-0000-000000000100",
  "cityName": "Екатеринбург",
  "name": "Пункт выдачи на Ленина",
  "address": "ул. Ленина, 1",
  "type": "pickup",
  "status": "active",
  "isDefaultPickup": true,
  "description": null,
  "updatedAt": "2026-05-06T00:00:00Z"
}
```

Location `type` values:

- `pickup`
- `service_area`

## Step 1: Registration And Email Verification

Goal: a new provider owner candidate can create a normal user account and verify email before provider onboarding.

### API Endpoints

#### Register

```http
POST /api/v1/auth/register
```

Request:

```json
{
  "name": "Ivan",
  "surname": "Petrov",
  "email": "ivan@example.com",
  "password": "strong-password",
  "app": "crm"
}
```

Response:

```json
{
  "userId": "00000000-0000-0000-0000-000000000001",
  "name": "Ivan",
  "surname": "Petrov",
  "email": "ivan@example.com",
  "emailVerified": false
}
```

Frontend behavior:

- show success state after registration
- tell the user to check email
- pass `app: "crm"` so verification links return to `crm.sportgearhub.ru`
- in development, offer a link to the dev email outbox
- do not auto-mark email verified locally

#### Read Dev Emails

```http
GET /api/v1/development/emails
```

Development only. Use this to extract verification links while developing.

#### Verify Email

```http
POST /api/v1/auth/email/verify
```

Request:

```json
{
  "token": "token-from-email-link"
}
```

Frontend behavior:

- route: `/auth/verify-email?token=...`
- submit token to API
- show verified state
- offer sign-in after success
- show expired/invalid token state with resend option

#### Resend Verification

```http
POST /api/v1/auth/email/verification
```

Request:

```json
{
  "email": "ivan@example.com",
  "app": "crm"
}
```

Frontend behavior:

- use from verification-error screen and post-registration screen
- pass `app: "crm"` so verification links return to `crm.sportgearhub.ru`
- always show generic success copy

### Checklist

- [ ] registration screen
- [ ] registration API client method
- [ ] post-registration check-email screen
- [ ] dev email outbox helper for local development
- [ ] verify-email callback route
- [ ] resend verification action
- [ ] invalid or expired verification token state

## Step 2: Sign In And Session

Goal: a verified or existing user can sign in and the app can load current user state.

### API Endpoints

#### Password Login

```http
POST /api/v1/auth/login
```

Request:

```json
{
  "email": "ivan@example.com",
  "password": "strong-password"
}
```

Response:

```json
{
  "userId": "00000000-0000-0000-0000-000000000001",
  "name": "Ivan",
  "surname": "Petrov",
  "email": "ivan@example.com",
  "emailVerified": true
}
```

Frontend behavior:

- call with credentials enabled
- after success, call `GET /api/v1/auth/me`
- if `emailVerified` is false, route to check-email/resend screen
- call `GET /api/v1/auth/provider-memberships`
- if memberships exist, enter provider shell or show provider switcher
- otherwise route to provider onboarding

#### Current User

```http
GET /api/v1/auth/me
```

Response:

```json
{
  "userId": "00000000-0000-0000-0000-000000000001",
  "name": "Ivan Petrov",
  "email": "ivan@example.com",
  "roles": ["User"]
}
```

#### Current Provider Memberships

```http
GET /api/v1/auth/provider-memberships
```

Response:

```json
{
  "memberships": [
    {
      "providerId": "00000000-0000-0000-0000-000000000010",
      "displayName": "Sportgearhub Rentals",
      "role": "owner",
      "operatingState": "active"
    }
  ]
}
```

Frontend behavior:

- if `memberships.length > 0`, show provider workspace or provider switcher
- if `memberships.length === 0`, call `GET /api/v1/provider-onboarding/current`

#### Sign Out

```http
POST /api/v1/auth/signout
```

Response:

- `204 No Content`

### Optional OIDC Token Flow

If the provider web app uses bearer tokens instead of cookie-only calls:

1. Ensure the user has a local API session.
2. Start `/connect/authorize` for `sportgearhub-provider-console`.
3. Exchange authorization code at `/connect/token`.
4. Store token in the app's normal auth layer.
5. Use `GET /connect/userinfo` to validate `provider_api` and provider claims.

### Checklist

- [ ] sign-in screen
- [ ] login API client method with credentials
- [ ] current-user loader
- [ ] auth guard for signed-out users
- [ ] email-unverified guard
- [ ] provider-access guard
- [ ] sign-out action
- [ ] optional OIDC callback route if bearer tokens are used

## Step 3: Password Reset

Goal: a user can recover access without support/operator intervention.

### API Endpoints

#### Forgot Password

```http
POST /api/v1/auth/password/forgot
```

Request:

```json
{
  "email": "ivan@example.com",
  "app": "crm"
}
```

Frontend behavior:

- always show generic success copy
- pass `app: "crm"` so reset links return to `crm.sportgearhub.ru`
- in development, point to dev email outbox

#### Reset Password

```http
POST /api/v1/auth/password/reset
```

Request:

```json
{
  "token": "token-from-email-link",
  "newPassword": "new-strong-password"
}
```

Frontend behavior:

- route: `/auth/reset-password?token=...`
- require password confirmation client-side
- after success, route to sign-in
- show expired/invalid token state with link back to forgot-password

### Checklist

- [ ] forgot-password screen
- [ ] forgot-password API client method
- [ ] reset-password callback route
- [ ] reset-password API client method
- [ ] password confirmation validation
- [ ] expired or invalid reset token state

## Step 4: Provider Onboarding Entry

Start this only after the auth slice is stable.

Initial API calls:

- `GET /api/v1/provider-onboarding/options`
- `GET /api/v1/provider-onboarding/current`
- `POST /api/v1/provider-onboarding/current`
- `PATCH /api/v1/provider-onboarding/current/profile`
- `POST /api/v1/provider-onboarding/current/submit`

#### Onboarding Options

```http
GET /api/v1/provider-onboarding/options
```

Use this response to render legal country and organization/legal form choices. Do not hardcode legal form values in the web app.

Response:

```json
{
  "legalCountries": [
    {
      "value": "RU",
      "label": "Россия"
    }
  ],
  "legalForms": [
    {
      "value": "self_employed",
      "label": "Самозанятый",
      "requiredLegalIdentityFields": [
        "legalCountryCode",
        "legalForm",
        "legalName",
        "taxNumber",
        "registeredAddress"
      ]
    },
    {
      "value": "sole_proprietor",
      "label": "ИП",
      "requiredLegalIdentityFields": [
        "legalCountryCode",
        "legalForm",
        "legalName",
        "taxNumber",
        "registeredAddress",
        "registrationNumber"
      ]
    },
    {
      "value": "company",
      "label": "Организация",
      "requiredLegalIdentityFields": [
        "legalCountryCode",
        "legalForm",
        "legalName",
        "taxNumber",
        "registeredAddress",
        "registrationNumber",
        "branchNumber"
      ]
    }
  ]
}
```

#### Current Onboarding

```http
GET /api/v1/provider-onboarding/current
```

Response when the signed-in user has not started provider onboarding:

```json
{
  "applicationId": null,
  "providerId": null,
  "status": "not_started",
  "checklist": null,
  "draft": null,
  "updatedAt": "2026-05-06T00:00:00Z"
}
```

Response after an application exists:

```json
{
  "applicationId": "00000000-0000-0000-0000-000000000001",
  "providerId": null,
  "status": "draft",
  "checklist": {
    "profile": "missing",
    "legal": "missing"
  },
  "draft": {
    "displayName": "Sportgearhub Rentals",
    "legalName": null,
    "legalCountryCode": null,
    "legalForm": null,
    "taxNumber": null,
    "registrationNumber": null,
    "branchNumber": null,
    "registeredAddress": null,
    "contactEmail": null,
    "contactPhone": null,
    "city": null,
    "address": null,
    "description": null
  },
  "updatedAt": "2026-05-06T00:00:00Z"
}
```

#### Start Onboarding

```http
POST /api/v1/provider-onboarding/current
```

Request:

- send JSON, even when creating an empty draft: `{}`
- include any known draft fields in the JSON body to prefill the draft

Response:

- `201 Created`
- same shape as `GET /api/v1/provider-onboarding/current` after an application exists

Checklist contract:

- values: `missing` or `ready`
- `profile`: ready when display name and contact email or contact phone are present
- `legal`: ready when all `requiredLegalIdentityFields` for the selected legal form are present

Provider location note:

- `registeredAddress` is the legal registration address and belongs to onboarding/legal identity.
- `city` and `address` are a simple provider profile location only; do not use them as the long-term source of pickup point truth.
- Pickup points / addresses of handover should become separate provider locations after provider approval, because one provider can operate multiple places.
- Future provider locations should reference a city catalog instead of storing free-text city names.

Frontend routing:

- `not_started` -> start onboarding
- `draft` or `changes_requested` -> onboarding form; derive missing sections from `checklist`
- `submitted` or `in_review` -> review/waiting screen
- `approved` with provider membership from `GET /api/v1/auth/provider-memberships` -> provider console
- `rejected` or `cancelled` -> decision/support screen

Checklist:

- [ ] route signed-in users without provider membership to onboarding
- [ ] current onboarding loader
- [ ] create onboarding application
- [ ] profile form
- [ ] submit for review
- [ ] review/requested-changes state

## Shared Frontend Implementation Checklist

- [ ] typed API client with `credentials: "include"` support
- [ ] centralized API error normalization
- [ ] 401 handling routes to sign in
- [ ] 403 handling shows forbidden state
- [ ] loading, empty, error, and success states for auth screens
- [ ] dev-only email outbox helper hidden outside development builds
- [ ] no frontend-only provider/admin role grants
