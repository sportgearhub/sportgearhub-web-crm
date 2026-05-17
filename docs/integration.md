# Sportgearhub Web Provider Console API Integration

This file is the working integration plan for `sportgearhub-web-provider-console`.

Use `sportgearhub-web-provider-console-prototype.md` as the product brief. Use this file for implementation order, endpoint wiring, and current checklist status.

## Current API Base Assumptions

- API authority is configured per environment by the web app.
- Provider web origin is configured per environment by the web app.
- Provider OIDC client id: `sportgearhub-provider`.
- Provider callback route: `/auth/callback`.
- Provider scopes: `openid profile email offline_access roles provider_api`.
- Cookie-based API calls must use browser credentials.
- Bearer-token API calls must use the OIDC access token.

API routes:

- Swagger: `/swagger`
- Health: `/health`
- Cities: `/api/v1/catalog/cities`
- Email auth start: `/api/v1/auth/email/start`
- Registration invitation context: `/api/v1/auth/registration-invitations/{token}`
- Register: `/api/v1/auth/register`
- Magic sign-in: `/api/v1/auth/magic-sign-in`
- Session login: `/api/v1/auth/session-login`
- Token/password grant login: `/api/v1/auth/login`
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

## API Error Contract

Most API-level business and auth failures return `application/problem+json`-style JSON with a stable `code` extension. The API is RU-first for now, so `title` and `detail` are localized Russian messages that can be shown in the frontend.

Frontend code should still branch on `code`, not on localized text or HTTP status alone.

Shape:

```json
{
  "type": "about:blank",
  "title": "Пароль должен содержать не менее 8 символов.",
  "status": 400,
  "detail": "Пароль должен содержать не менее 8 символов.",
  "instance": "/api/v1/auth/register",
  "code": "auth.password_too_short"
}
```

Frontend normalization:

- keep `status`, `title`, `detail`, and `code`
- show `title` or `detail` directly when the UI has no better field-level copy
- use `code` for field-specific UI states
- show generic copy for security-sensitive flows where this document says to do so
- keep the raw response only for logs/diagnostics, not for UI branching

Bad integration to avoid:

- do not treat every `400` as the same registration failure
- do not parse `title` to detect password, email, or token errors
- do not ignore `code: "auth.password_too_short"` and show a generic server error
- do not send JSON credentials to `/api/v1/auth/login`; JSON cookie login belongs to `/api/v1/auth/session-login`
- do not use legacy `/api/auth/*` routes in new provider web code

## Location Model

Location concepts are intentionally split:

- `registeredAddress`: legal registration address for onboarding, acquiring, payout, and compliance
- `cityId`: platform city catalog identity used by provider profile, provider operational locations, and future marketplace filtering
- `provider location`: provider-owned pickup/service place, created after provider access exists

Do not model “Адрес точки выдачи” as onboarding legal identity. A provider can have multiple pickup/service places.

The city catalog is the Sportgearhub source of truth for supported service cities. Dadata can be added later for address/legal identity suggestions, but it must not auto-create supported cities during provider registration.

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

## Step 1: Email Start, Registration Invitation, And Magic Sign-In

Goal: a provider owner candidate proves access to an email before account creation, while existing users can receive a magic sign-in link. This is the primary provider-console auth entry flow.

The email-start endpoint performs email validation, including configured MX checks. This flow may later be mirrored by phone-first verification with the same proof-token pattern.

### API Endpoints

#### Start Email Auth

```http
POST /api/v1/auth/email/start
```

Request:

```json
{
  "email": "ivan@example.com",
  "app": "crm"
}
```

Response:

```json
{
  "accepted": true,
  "message": "Если email корректен, письмо отправлено."
}
```

Behavior:

- unknown email: API sends `/auth/register?token=registration_invitation_token`
- existing email: API sends `/auth/magic-sign-in?token=magic_sign_in_token`
- invalid email shape or MX failure: API returns `auth.email_invalid`
- `app` must be `crm` for provider web links

The registration invitation token is proof of email access only. It is not a user/session token.

#### Read Registration Invitation

```http
GET /api/v1/auth/registration-invitations/{token}
```

Response:

```json
{
  "email": "ivan@example.com",
  "expiresAt": "2026-05-17T12:00:00Z"
}
```

Frontend behavior:

- route: `/auth/register?token=...`
- call this endpoint before rendering the registration form
- lock/prefill the email from the response
- show expired/invalid token state if the token cannot be read

#### Register With Invitation Token

```http
POST /api/v1/auth/register
```

Request:

```json
{
  "token": "registration_invitation_token",
  "name": "Ivan",
  "surname": "Petrov",
  "password": "optional-if-password-login-is-enabled"
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

- after success, call `/api/v1/auth/me` if the API set a session cookie in the current implementation path
- if no session is present, route through sign-in/magic-link flow
- do not let the user edit email; the token owns the email
- password is optional for token registration, but if the UI asks for it, enforce the API minimum of 8 characters

#### Magic Sign-In

```http
POST /api/v1/auth/magic-sign-in
```

Request:

```json
{
  "token": "magic_sign_in_token"
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

- route: `/auth/magic-sign-in?token=...`
- submit the token to the API
- after success, call `/api/v1/auth/me`
- then call `/api/v1/auth/provider-memberships`

#### Legacy Password Register

The old password-registration path still exists for compatibility, but new provider web code should prefer email-start registration.

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

Response has `emailVerified: false` and requires email verification.

Auth errors:

```json
{
  "title": "Пароль должен содержать не менее 8 символов.",
  "status": 400,
  "detail": "Пароль должен содержать не менее 8 символов.",
  "instance": "/api/v1/auth/register",
  "code": "auth.password_too_short"
}
```

Stable auth error codes for this slice:

- `auth.email_required`: email is missing or blank
- `auth.email_invalid`: email shape or email receiving checks failed
- `auth.password_too_short`: password is missing, blank, or shorter than 8 characters
- `auth.email_already_exists`: account already exists for the normalized email
- `auth.invalid_email_app`: `app` is not one of `client`, `crm`, or `admin`
- `auth.token_invalid`: token is malformed or not for this purpose
- `auth.token_invalid_or_expired`: token is expired or no longer valid

Current RU messages:

- `auth.email_required`: `Укажите email.`
- `auth.email_invalid`: `Укажите корректный email.`
- `auth.password_too_short`: `Пароль должен содержать не менее 8 символов.`
- `auth.email_already_exists`: `Пользователь с таким email уже существует.`
- `auth.invalid_email_app`: `Некорректное приложение для email-ссылки.`
- `auth.token_invalid`: `Ссылка недействительна.`
- `auth.token_invalid_or_expired`: `Ссылка недействительна или срок ее действия истек.`

Frontend behavior:

- first ask for email only and call `/api/v1/auth/email/start`
- show generic check-email copy after email-start success
- in development, offer a link to the dev email outbox
- use the link path to decide whether to render register or magic-sign-in callback
- do not auto-mark email verified locally; trust the API response
- map `auth.password_too_short` to the password field, using the API minimum of 8 characters
- map `auth.email_required`, `auth.email_invalid`, and `auth.email_already_exists` to the email field
- treat `auth.invalid_email_app` as an integration/configuration error; provider web should send `app: "crm"`
- preserve the user's typed form values after a registration error except for password confirmation fields if the local UX clears them intentionally

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
- pass `app: "crm"` so the email link returns to `crm.sportgearhub.ru`
- always show generic success copy

### Checklist

- [x] email-start screen
- [x] email-start API client method
- [x] check-email screen
- [x] registration invitation context API client method
- [x] token-based registration screen
- [x] token-based registration API client method
- [x] magic-sign-in callback route
- [x] magic-sign-in API client method
- [x] dev email outbox helper for local development
- [x] invalid or expired invitation/magic token state
- [x] legacy verify-email callback only if password registration remains exposed
- [x] legacy resend verification action only if password registration remains exposed

## Step 2: Sign In And Session

Goal: a verified or existing user can sign in and the app can load current user state.

### API Endpoints

#### Password Session Login

```http
POST /api/v1/auth/session-login
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
- use this endpoint for JSON browser-session login
- after success, call `GET /api/v1/auth/me`
- if `emailVerified` is false, route to check-email/resend screen
- call `GET /api/v1/auth/provider-memberships`
- if memberships exist, enter provider shell or show provider switcher
- otherwise route to provider onboarding

Login errors:

- `auth.invalid_credentials`: show one generic email/password error; do not reveal whether the email exists
- missing username/password validation may return `400`; show the relevant required field state locally before calling the API where possible

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
2. Start `/connect/authorize` for `sportgearhub-provider`.
3. Exchange authorization code at `/connect/token`.
4. Store token in the app's normal auth layer.
5. Use `GET /connect/userinfo` to validate `provider_api` and provider claims.

Password grant shortcut:

- endpoint: `POST /api/v1/auth/login`
- content type: `application/x-www-form-urlencoded`
- body fields: `grant_type=password`, `client_id=sportgearhub-provider`, `username`, `password`, `scope`
- use only when the app intentionally uses bearer tokens; do not call this endpoint with JSON

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
- pass `app: "crm"` so the reset link returns to `crm.sportgearhub.ru`
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

- `GET /api/v1/catalog/cities`
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
    "cityId": null,
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
- use `cityId` from `GET /api/v1/catalog/cities`; do not send a free-text city

Example with initial profile fields:

```json
{
  "displayName": "Sportgearhub Rentals",
  "contactEmail": "provider@example.com",
  "cityId": "00000000-0000-0000-0000-000000000100",
  "address": "ул. Ленина, 1"
}
```

Response:

- `201 Created`
- same shape as `GET /api/v1/provider-onboarding/current` after an application exists

Checklist contract:

- values: `missing` or `ready`
- `profile`: ready when display name and contact email or contact phone are present
- `legal`: ready when all `requiredLegalIdentityFields` for the selected legal form are present

Provider location note:

- `registeredAddress` is the legal registration address and belongs to onboarding/legal identity.
- `cityId` points to `/api/v1/catalog/cities`; web should send the selected catalog city id, not free text.
- `address` is a simple provider profile address only; do not use it as the long-term source of pickup point truth.
- Pickup points / addresses of handover should become separate provider locations after provider approval, because one provider can operate multiple places.
- Provider locations reference the same city catalog. Treat `cityId` as canonical; `cityName` in location responses is display convenience.

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
