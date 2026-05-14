# Sportgearhub Provider CRM Integration

This is the single structured API integration file for the provider CRM web app.

Use this file for endpoint wiring, app-specific auth payloads, and current checklist status.

## Current API Base Assumptions

- API authority is configured per environment by the web app.
- Provider web origin is configured per environment by the web app.
- Provider OIDC client id: `sportgearhub-provider`.
- Provider callback route: `/auth/callback`.
- Provider scopes: `openid profile email offline_access roles provider_api`.
- Bearer-token API calls must use the OIDC access token.
- Backend persistence is organized by PostgreSQL bounded-context schemas (`auth`, `catalog`, `provider`, `inventory`, `booking`, `payments`, `operations`, `equipment`). This is operational structure only and does not change frontend route paths.

API routes:

- Swagger document: `/swagger/provider/swagger.json`
- Swagger UI: `/swagger`
- Health: `/health`
- Cities: `/api/v1/catalog/cities`
- Register: `/api/v1/auth/register`
- Login: `/api/v1/auth/login`
- Current user: `/api/v1/auth/me`
- Current provider memberships: `/api/v1/auth/provider-memberships`
- Dev email outbox: `/api/v1/development/emails`
- Provider onboarding options: `/api/v1/provider-onboarding/options`
- Current provider onboarding: `/api/v1/provider-onboarding/current`
- Provider onboarding RU legal identity lookup: `/api/v1/provider-onboarding/legal-identity/ru/lookup`
- RU address suggestions: `/api/v1/addresses/ru/suggestions`
- Provider locations: `/api/v1/provider/locations`
- Provider profile: `/api/v1/provider/profile`
- Equipment categories: `/api/v1/provider/equipment-categories`
- Equipment category attributes: `/api/v1/provider/equipment-categories/{categorySlug}/attributes`
- Equipment brand suggestions: `/api/v1/provider/equipment-brands/suggestions`
- Equipment brand create/request: `/api/v1/provider/equipment-brands`
- Provider resources: `/api/v1/provider/resources`
- Provider resource variants: `/api/v1/provider/resources/{resourceId}/variants`
- Provider inventory units: `/api/v1/provider/resources/{resourceId}/units`
- Provider inventory summary: `/api/v1/provider/resources/{resourceId}/inventory-summary`
- Provider offers: `/api/v1/provider/offers`
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

### Sign In And Tokens

Provider CRM sign-in uses the OIDC password grant through the login alias:

```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded
```

Form body:

```text
grant_type=password
client_id=sportgearhub-provider
username=<provider-user-email>
password=<provider-user-password>
scope=openid profile email offline_access roles provider_api
```

The response is the OpenIddict token envelope:

```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "id_token": "..."
}
```

Store the token response in provider auth state. Call authenticated APIs with:

```http
Authorization: Bearer <access_token>
```

Before provider approval, the user may sign in with `public_api` scope to continue onboarding. After approval, refresh/sign in with `provider_api` scope for `/api/v1/provider/*`.

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
Content-Type: application/x-www-form-urlencoded
```

Form body:

```text
grant_type=password
client_id=sportgearhub-provider
username=ivan@example.com
password=strong-password
scope=openid profile email offline_access roles provider_api
```

Response:

```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "id_token": "..."
}
```

Frontend behavior:

- store the token response in auth state
- call authenticated APIs with `Authorization: Bearer <access_token>`
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
2. Start `/connect/authorize` for `sportgearhub-provider`.
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
- optional: `GET /api/v1/provider-onboarding/legal-identity/ru/lookup?taxNumber={inn}&branchNumber={kpp?}`
- optional: `GET /api/v1/addresses/ru/suggestions?query={address}&count={count?}`

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

#### Legal Identity Lookup

```http
GET /api/v1/provider-onboarding/legal-identity/ru/lookup?taxNumber=7707083893&branchNumber=770701001
```

Use this as an optional INN/KPP helper before saving the draft. It returns one DaData-backed suggestion for RU legal identity fields:

```json
{
  "source": "dadata",
  "legalCountryCode": "RU",
  "legalForm": "company",
  "legalName": "ПАО СБЕРБАНК",
  "taxNumber": "7707083893",
  "registrationNumber": "1027700132195",
  "branchNumber": "770701001",
  "registeredAddress": "117312, г Москва, ул Вавилова, д 19"
}
```

Frontend behavior:

- call on explicit user action or after the user finishes editing INN/KPP
- show returned values as a prefill/confirmation, not as a hidden overwrite
- persist accepted fields with `POST /api/v1/provider-onboarding/current` or `PATCH /api/v1/provider-onboarding/current/profile`
- if the API returns `404`, keep manual input available

#### Address Suggestions

```http
GET /api/v1/addresses/ru/suggestions?query=Екатеринбург%20Ленина&count=10
```

Response shape:

```json
{
  "source": "dadata",
  "suggestions": [
    {
      "value": "г Екатеринбург, ул Ленина",
      "unrestrictedValue": "Свердловская обл, г Екатеринбург, ул Ленина",
      "fiasId": "00000000-0000-0000-0000-000000000000",
      "kladrId": "6600000100000000000"
    }
  ]
}
```

- use this global helper for `registeredAddress`, the simple provider profile `address`, and future address fields in other apps
- debounce typing and avoid calls before 3 non-space characters
- let users type an address manually even when suggestions are empty
- store the selected/free-typed string through the existing onboarding draft endpoints
- do not treat suggestion metadata such as `fiasId`, `kladrId`, or coordinates as onboarding truth yet

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

## Step 5: Post-Approval Provider Workspace

After internal approval, the API creates:

- `Provider`
- owner `ProviderMembership`
- user `Provider` role

Newly approved providers do not receive seeded resources, inventory units, or offers. Demo seed data exists only for the built-in development provider. The provider CRM must guide real providers through setup before they can sell rental inventory.

Entry behavior:

1. Call `GET /api/v1/auth/provider-memberships`.
2. If memberships exist, select a provider workspace.
3. Call `GET /api/v1/provider/profile`.
4. If the profile has no resources/offers, route to inventory setup instead of marketplace publishing.

Provider profile:

```http
GET /api/v1/provider/profile
```

The profile response includes `providerId`, legal/profile fields, `operatingState`, and summary diagnostics such as `active_resources`, `total_resources`, `active_offers`, and `total_offers`.

### Rental Inventory Setup Flow

For current rental equipment services, treat inventory setup as the first provider task after approval.

Domain mapping:

- `ProviderResource`: operational thing the provider owns or manages, for example `Горные лыжи`
- `ResourceVariant`: classification of that resource, for example `170cm / adult`
- `ProviderResourceUnit`: physical rentable item, for example `SKI-001`
- `Offer`: commercial package customers can discover/book, for example `Аренда горных лыж на день`

Do not ask the provider to create offers before they have described real stock. Offers should be created after resources, variants, units, availability, pricing, and policies are at least minimally ready.

#### Equipment Schema, Brands, And Inventory Intake

Inventory intake is schema-driven. The frontend should not hardcode bicycle-specific fields except as presentation components for known attribute keys. The API owns categories, localized labels, enum values, visibility rules, and brand canonicalization.

Current implementation matrix:

| Area | Status | Frontend behavior |
| --- | --- | --- |
| category list | ready | use for category picker |
| category attributes | ready | use to render variant/unit forms |
| brand suggestions/create | ready | use for `brand` reference fields |
| resource create/update | existing contract | create the operational root; category is selected in UI but not persisted on the resource contract yet |
| variant create/update | bridge contract | send schema field values through `normalizedAttributes` until typed `attributes` lands |
| unit create/update | existing contract | create physical stock; typed unit attributes are next API slice |
| offer create | existing contract | create only after resource, variants, units, availability, pricing, and policies are minimally configured |

Provider inventory flow:

1. Load categories and let the provider choose what they rent.
2. Load the selected category schema.
3. Resolve or create referenced brands through the API.
4. Create the `ProviderResource` operational root.
5. Create one or more `ResourceVariant` records from schema fields that apply to `variant`.
6. Add physical `ProviderResourceUnit` records and assign them to variants where useful.
7. Configure availability, pricing, and policies.
8. Create the commercial `Offer`.

Read categories:

```http
GET /api/v1/provider/equipment-categories?locale=ru-RU
```

Response:

```json
[
  {
    "categoryId": "00000000-0000-0000-0000-000000000001",
    "slug": "bicycle",
    "label": "Велосипед",
    "labels": {
      "ru-RU": "Велосипед",
      "en-US": "Bicycle"
    },
    "resourceType": "equipment",
    "capacityMode": "inventory",
    "status": "active",
    "sortOrder": 10
  }
]
```

Use `resourceType` and `capacityMode` from the selected category when creating the resource.

Read category attributes:

```http
GET /api/v1/provider/equipment-categories/bicycle/attributes?locale=ru-RU
```

Response shape:

```json
{
  "category": {
    "categoryId": "00000000-0000-0000-0000-000000000001",
    "slug": "bicycle",
    "label": "Велосипед",
    "resourceType": "equipment",
    "capacityMode": "inventory",
    "status": "active",
    "sortOrder": 10
  },
  "attributes": [
    {
      "attributeId": "00000000-0000-0000-0000-000000000101",
      "key": "brand",
      "label": "Бренд",
      "labels": {
        "ru-RU": "Бренд",
        "en-US": "Brand"
      },
      "valueType": "reference",
      "unit": null,
      "unitLabel": null,
      "referenceType": "equipment_brand",
      "requiredOn": ["variant"],
      "appliesTo": ["variant"],
      "visibleWhen": [],
      "filterable": true,
      "comparable": true,
      "searchable": true,
      "sortOrder": 10,
      "allowedValues": []
    }
  ]
}
```

Schema field handling:

- `key`: stable machine name to store in form state.
- `label` and `labels`: localized display text.
- `valueType`: input type, one of `string`, `enum`, `decimal`, `integer`, `boolean`, `datetime`, `reference`.
- `referenceType: "equipment_brand"`: render brand lookup/create UX.
- `requiredOn`: scopes where the field is required, for example `variant` or `unit`.
- `appliesTo`: scopes where the field belongs.
- `visibleWhen`: conditional visibility rule.
- `filterable`, `comparable`, `searchable`: future marketplace/search hints; keep them in the typed client.
- `allowedValues`: predefined values with localized labels. For `enum`, submit the stable `valueKey`. For numeric fields such as `decimal` and `integer`, treat these as suggested values/chips and still allow manual numeric input unless a later schema flag says otherwise.

Conditional field example:

```json
{
  "key": "motor_power_w",
  "label": "Мощность мотора",
  "valueType": "integer",
  "unit": "W",
  "unitLabel": "Вт",
  "appliesTo": ["variant"],
  "visibleWhen": [
    {
      "attributeKey": "bike_type",
      "allowedValueKeys": ["e_bike"]
    }
  ]
}
```

Frontend behavior for conditional fields:

- Render fields by `sortOrder`.
- Recompute visibility when the controlling attribute changes.
- Do not submit hidden optional values.
- If a field becomes hidden, clear its dirty value or ask the user before preserving it.
- Treat frontend visibility as UX; API validation remains authoritative.

For the seeded `bicycle` schema, expect variant-level fields such as:

- `brand`: reference to equipment brand
- `model`: model name, for example `Marlin 6`
- `bike_type`: enum such as `mountain`, `road`, `city`, `gravel`, `kids`, `e_bike`
- `frame_size`: frame size, for example `M`, `L`, `17`
- `wheel_size_in`: wheel size in inches, for example `26`, `27.5`, `29`; render suggested values from `allowedValues`, but allow manual decimal input when the value is not listed
- `brake_type`, `drivetrain_type`, `suspension_type`
- conditional electric/suspension fields such as `motor_power_w` or `suspension_travel_front_mm`

Brand suggestions:

```http
GET /api/v1/provider/equipment-brands/suggestions?query=trek&category=bicycle
```

Response:

```json
{
  "items": [
    {
      "brandId": "00000000-0000-0000-0000-000000000201",
      "canonicalName": "Trek",
      "status": "approved",
      "confidence": 1.0,
      "matchKind": "brand_exact"
    }
  ]
}
```

Create/request missing brand:

```http
POST /api/v1/provider/equipment-brands
```

Request:

```json
{
  "name": "NorthPeak",
  "category": "bicycle",
  "website": null,
  "countryCode": "RU"
}
```

Response when matched:

```json
{
  "status": "matched",
  "brand": {
    "brandId": "00000000-0000-0000-0000-000000000201",
    "canonicalName": "Trek",
    "status": "approved",
    "website": null,
    "countryCode": null
  },
  "matches": []
}
```

Response when newly requested:

```json
{
  "status": "created_pending_review",
  "brand": {
    "brandId": "00000000-0000-0000-0000-000000000301",
    "canonicalName": "NorthPeak",
    "status": "pending_review",
    "website": null,
    "countryCode": "RU"
  },
  "matches": []
}
```

Brand frontend behavior:

- Search before allowing free text creation.
- Show alias matches such as `Trek Bicycle`.
- If no suggestion fits, call create/request and keep the returned `brandId`.
- `pending_review` brands are usable immediately in provider inventory flows.
- Do not create local-only brand strings; the API owns duplicate checking and canonicalization.

#### Create Equipment Resource

```http
POST /api/v1/provider/resources
```

Request:

```json
{
  "resourceType": "equipment",
  "capacityMode": "inventory",
  "title": "Велосипеды",
  "baseCapacity": 12
}
```

Current contract notes:

- Use the selected category's `resourceType` and `capacityMode`.
- Use a provider-facing group title such as `Велосипеды`, `Горные лыжи`, or `SUP-доски`.
- `baseCapacity` is a summary/default capacity only. Physical stock truth comes from units.
- The current resource contract does not persist `categorySlug` yet. Keep the selected category in wizard state to drive the next variant/unit screens.

#### Create Resource Variant

```http
POST /api/v1/provider/resources/{resourceId}/variants
```

Request:

```json
{
  "variantKey": "TREK-MARLIN-6-M-29",
  "variantType": "equipment_configuration",
  "label": "Trek Marlin 6 / M / 29\"",
  "normalizedAttributes": [
    { "key": "brand", "value": "00000000-0000-0000-0000-000000000201" },
    { "key": "brand_name", "value": "Trek" },
    { "key": "model", "value": "Marlin 6" },
    { "key": "bike_type", "value": "mountain" },
    { "key": "frame_size", "value": "M" },
    { "key": "wheel_size_in", "value": "29" },
    { "key": "brake_type", "value": "disc_hydraulic" }
  ],
  "sortOrder": 10,
  "status": "active"
}
```

Current bridge behavior:

- Build `normalizedAttributes` from schema attributes where `appliesTo` contains `variant`.
- Store enum values by stable `valueKey`.
- Store reference values as ids when available; include a display helper such as `brand_name` while the typed `attributes` contract is still pending.
- Use `variantType: "equipment_configuration"` for schema-based equipment variants. Do not use `size` as the generic new value; frame size, wheel size, and other size-like fields are just attributes.
- Generate `variantKey` deterministically from key distinguishing fields. For bicycles, a good key is brand/model/frame/wheel, normalized to uppercase ASCII-like segments.

Target contract after the backend typed-attributes slice:

```json
{
  "variantKey": "TREK-MARLIN-6-M-29",
  "label": "Trek Marlin 6 / M / 29\"",
  "attributes": {
    "brand": "00000000-0000-0000-0000-000000000201",
    "model": "Marlin 6",
    "bike_type": "mountain",
    "frame_size": "M",
    "wheel_size_in": 29,
    "brake_type": "disc_hydraulic"
  },
  "sortOrder": 10,
  "status": "active"
}
```

Variants are the provider's stock grouping for booking and selection. For most rental inventory, create variants before adding units.

#### Add Physical Inventory Units

```http
POST /api/v1/provider/resources/{resourceId}/units
```

Request:

```json
{
  "resourceVariantId": "00000000-0000-0000-0000-000000000020",
  "inventoryCode": "BIKE-001",
  "displayName": "Trek Marlin 6 M #001",
  "status": "active",
  "conditionStatus": "ready",
  "externalReferenceCode": null
}
```

Inventory rules:

- `unitId` is platform identity.
- `providerId + inventoryCode` is provider-scoped physical/human identity.
- If `inventoryCode` is omitted, the API can generate one.
- Use `status: "active"` and `conditionStatus: "ready"` for rentable units.
- Use maintenance/damaged/inactive/retired statuses to keep stock visible but unavailable.
- Put stable reusable specs on the variant, not on every unit.
- Use units for serial/inventory identity, condition, operational status, and later per-unit inspection facts.
- Unit-level schema attributes are planned, but the current endpoint accepts only the fields shown above. Do not treat frontend-only unit attributes as backend truth.

Useful reads:

```http
GET /api/v1/provider/resources/{resourceId}/units
GET /api/v1/provider/resources/{resourceId}/inventory-summary
PATCH /api/v1/provider/resources/{resourceId}/units/{unitId}
POST /api/v1/provider/resources/{resourceId}/units/{unitId}/archive
```

#### Configure Availability, Pricing, And Policies

Use the resource configuration endpoints before creating or activating public offers:

- availability profile/calendar for when inventory can be booked
- pricing policy for rental prices
- policy profile/overrides for cancellation, deposits, handover, and return rules

The provider CRM should show readiness panels from the API where available and prevent “publish” UI from pretending an offer is bookable when required configuration is missing.

#### Create Commercial Offer

```http
POST /api/v1/provider/offers
```

Request:

```json
{
  "primaryResourceId": "00000000-0000-0000-0000-000000000010",
  "offerType": "rental",
  "bookingFlowType": "direct_checkout",
  "variantExposureMode": "all_active_variants",
  "title": "Аренда горных лыж",
  "description": "Посуточная аренда горных лыж",
  "locationRef": null
}
```

Offer notes:

- `Offer` is the commercial/discovery unit, not inventory truth.
- Inventory truth remains in `ProviderResourceUnit`.
- Booking execution should allocate/track actual units later in the booking/fulfillment flow.
- For now, use `offerType: "rental"` for equipment rental services.

Post-approval checklist:

- [ ] provider workspace shell after membership exists
- [ ] provider profile dashboard with resource/offer counters
- [ ] empty-state route to inventory setup
- [ ] create resource form for equipment inventory
- [ ] variant list/create/edit flow
- [ ] inventory unit list/create/edit/archive flow
- [ ] inventory summary panel
- [ ] availability/pricing/policy setup entry points
- [ ] offer create flow after resource inventory exists

## Shared Frontend Implementation Checklist

- [ ] typed API client with `credentials: "include"` support
- [ ] centralized API error normalization
- [ ] 401 handling routes to sign in
- [ ] 403 handling shows forbidden state
- [ ] loading, empty, error, and success states for auth screens
- [ ] dev-only email outbox helper hidden outside development builds
- [ ] no frontend-only provider/admin role grants
