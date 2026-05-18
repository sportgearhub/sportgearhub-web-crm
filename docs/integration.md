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
- Provider resources: `/api/v1/provider/resources`
- Provider availability profile: `/api/v1/provider/resources/{resourceId}/availability-profile`
- Provider availability calendar: `/api/v1/provider/resources/{resourceId}/availability-calendar`
- Provider availability diagnostics: `/api/v1/provider/resources/{resourceId}/availability-diagnostics`
- Provider resource slots: `/api/v1/provider/resources/{resourceId}/slots`
- Provider resource pricing policy: `/api/v1/provider/resources/{resourceId}/pricing-policy`
- Provider resource pricing diagnostics: `/api/v1/provider/resources/{resourceId}/pricing-diagnostics`
- Provider offer pricing policy: `/api/v1/provider/offers/{offerId}/pricing-policy`
- Provider offer pricing summary preview: `/api/v1/provider/offers/{offerId}/pricing-summary-preview`
- Provider pricing quote preview: `/api/v1/provider/pricing/quote-preview`
- Provider default policy profile: `/api/v1/provider/policy-profile`
- Provider resource policy override: `/api/v1/provider/resources/{resourceId}/policy`
- Provider resource policy diagnostics: `/api/v1/provider/resources/{resourceId}/policy-diagnostics`
- Provider offer policy override: `/api/v1/provider/offers/{offerId}/policy`
- Provider offer policy summary preview: `/api/v1/provider/offers/{offerId}/policy-summary-preview`
- Provider effective policy preview: `/api/v1/provider/policy/effective-preview`
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

## Provider Resources

Provider resource endpoints require a provider-authenticated session or bearer token with provider access.

Provider-facing model:

- resource is the provider-owned operational root
- category is stored on the resource as `{ slug, title }`
- variants inherit their attribute schema from the parent resource category
- uploaded resource images are owned by the resource and served through API media URLs
- offers may aggregate resource data, but frontend should not treat offers as resource truth

### Resource Authoring Flow

For the current bicycle flow:

1. Load categories:

```http
GET /api/v1/provider/resource-categories?resourceType=equipment&locale=ru-RU
Authorization: Bearer <access_token>
```

2. Create the resource:

```http
POST /api/v1/provider/resources
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "resourceType": "equipment",
  "capacityMode": "inventory",
  "category": "bicycle",
  "title": "Велосипед Stels Miss 6500"
}
```

3. Load variant fields from the selected category:

```http
GET /api/v1/provider/resource-categories/equipment/bicycle/attributes?locale=ru-RU
Authorization: Bearer <access_token>
```

4. Render one or more variant forms from the returned attribute schema.

5. Upload images for the resource:

```http
POST /api/v1/provider/resources/{resourceId}/images
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

Use form field `files`.

6. Use returned image `url` values directly in `<img src>`.

Do not construct image URLs from filesystem paths, provider ids, resource ids, or stored file names.

### Resource Categories

```http
GET /api/v1/provider/resource-categories
```

Query params:

- `resourceType`: optional, for example `equipment`
- `locale`: optional, for example `ru-RU`

Response item:

```json
{
  "categoryId": "0b1c1c1e-0000-4000-8000-000000000001",
  "resourceType": "equipment",
  "slug": "bicycle",
  "title": "Велосипед",
  "titles": {
    "ru-RU": "Велосипед",
    "en-US": "Bicycle"
  },
  "capacityMode": "inventory",
  "status": "active",
  "sortOrder": 10
}
```

### Category Attributes

```http
GET /api/v1/provider/resource-categories/{resourceType}/{categorySlug}/attributes?locale=ru-RU
```

Use this endpoint after the category is selected. The returned schema drives variant forms. For bicycles, expected fields include brand/model metadata, bicycle type, frame size, wheel size, brakes/suspension fields, and rider height range.

Important frontend rule:

- do not ask user for `variantType`
- do not ask user for base capacity
- do not store category per variant in frontend state
- keep resource-level fields separate from variant attributes
- create, update, and read variants with an `attributes` object shaped as `{ "attribute_key": "value" }`; do not use legacy `normalizedAttributes` arrays in new provider web code

Variant create request:

```json
{
  "variantKey": "STELS-MISS-6500-M-26",
  "label": "M / 26\" / 160-175 см",
  "attributes": {
    "brand": "Stels",
    "model": "Miss 6500",
    "model_year": "2025",
    "bike_type": "mountain",
    "frame_size": "m",
    "wheel_size_in": "26",
    "rider_height_min_cm": "160",
    "rider_height_max_cm": "175",
    "brake_type": "mechanical_disc",
    "suspension_type": "front"
  },
  "sortOrder": 1,
  "status": "active"
}
```

Variant response:

```json
{
  "variantId": "0a1a0000-0000-4000-8000-000000000202",
  "resourceId": "0a1a0000-0000-4000-8000-000000000101",
  "variantKey": "STELS-MISS-6500-M-26",
  "label": "M / 26\" / 160-175 см",
  "status": "active",
  "attributes": {
    "brand": "Stels",
    "model": "Miss 6500",
    "frame_size": "m",
    "wheel_size_in": "26"
  },
  "sortOrder": 1,
  "createdAt": "2026-05-18T10:00:00Z",
  "updatedAt": "2026-05-18T10:00:00Z"
}
```

Variant list supports resource-scoped filtering and sorting:

```http
GET /api/v1/provider/resources/{resourceId}/variants?status=active&attributes.frame_size=m&attributes.wheel_size_in=26&sort=attributes.frame_size,-updatedAt
```

Supported query params:

- `status`: optional variant status, for example `active`
- `attributes.{key}`: exact attribute value filter scoped to the selected resource
- `sort`: comma-separated sort terms

Supported sort terms:

- `sortOrder`
- `label`
- `variantKey`
- `status`
- `updatedAt`
- `attributes.{key}`

Prefix a sort term with `-` for descending order, for example `sort=-attributes.frame_size,label`.

Frontend behavior:

- use category schema to decide which attribute columns and filters to show
- send attribute filters as `attributes.frame_size=m`, not as a JSON body
- if no sort is selected, API returns variants by `sortOrder`, then `label`
- filtering and sorting are scoped to variants under the selected `resourceId`

### Resource Responses

Summary:

```json
{
  "resourceId": "0a1a0000-0000-4000-8000-000000000101",
  "resourceType": "equipment",
  "status": "active",
  "category": {
    "slug": "bicycle",
    "title": "Велосипед"
  },
  "title": "Велосипед Stels Miss 6500",
  "mediaPreviewUrl": "/api/v1/media/provider-resource-images/5513d83986374f91b577f46793b61f9e",
  "readiness": {},
  "publishabilityImpact": {},
  "updatedAt": "2026-05-18T10:00:00Z"
}
```

Detail adds:

- `providerId`
- `capacityMode`
- `createdAt`

### Resource Images

```http
GET /api/v1/provider/resources/{resourceId}/images
POST /api/v1/provider/resources/{resourceId}/images
GET /api/v1/media/provider-resource-images/{imageId}
```

Upload rules:

- `multipart/form-data`
- field name: `files`
- max 10 images per resource by default
- max 5 MB per file by default
- accepted content types: `image/jpeg`, `image/png`, `image/webp`

Image response:

```json
{
  "imageId": "5513d839-8637-4f91-b577-f46793b61f9e",
  "resourceId": "0a1a0000-0000-4000-8000-000000000101",
  "originalFileName": "front.jpg",
  "contentType": "image/jpeg",
  "sizeBytes": 82826,
  "url": "/api/v1/media/provider-resource-images/5513d83986374f91b577f46793b61f9e",
  "sortOrder": 0,
  "createdAt": "2026-05-18T10:00:00Z"
}
```

The media URL is public and API-owned. In local development, use the configured API proxy or prefix it with the API authority. If the frontend is served on `localhost:5173`, `/api/*` must proxy to the API process, for example `localhost:5093`.

Resource and offer list/detail responses expose `mediaPreviewUrl`. The API chooses the first resource image by `sortOrder`, then `createdAt`, unless an offer has its own explicit preview override. Frontend should use this field for cards and keep `/images` for gallery management.

## Provider Availability

Availability is configured under `ProviderResource`. The provider web app should treat it as execution-side configuration, not as customer-facing availability truth and not as search hint data.

Mode rule:

- equipment resources with `capacityMode: "inventory"` use `availabilityMode: "inventory"`
- service or experience resources with `capacityMode: "scheduled_slot"` use `availabilityMode: "scheduled_slot"`
- `availabilityMode` must match the resource `capacityMode`; the API rejects mismatches
- for MVP rental flow, configure inventory availability on equipment resources and keep scheduled-slot UI behind capability/feature gating until those offer types are enabled

### `/availability` Page Flow

The provider route `http://localhost:5173/availability` is a resource-scoped availability management screen. It does not manage offers directly.

Initial load:

1. Require a signed-in provider member with `provider_api` access.
2. Load resources with `GET /api/v1/provider/resources`.
3. Select the first resource by default, or keep the user-selected `resourceId`.
4. Derive the expected availability mode from the selected resource:
   - `capacityMode: "scheduled_slot"` -> `availabilityMode: "scheduled_slot"`
   - any other current resource mode -> `availabilityMode: "inventory"`
5. Load `GET /api/v1/provider/resources/{resourceId}/availability-profile`.
6. Load `GET /api/v1/provider/resources/{resourceId}/availability-diagnostics`.
7. Only when expected mode is `scheduled_slot`, also load:
   - `GET /api/v1/provider/resources/{resourceId}/availability-calendar`
   - `GET /api/v1/provider/resources/{resourceId}/slots`

Empty states:

- if the resource list is empty, show an empty inventory state and link the user to resource creation
- if profile `GET` returns `404`, treat it as “availability not configured yet” and show the default profile form
- default profile form values are `availabilityMode` from `capacityMode`, `timezone: "Asia/Yekaterinburg"`, `bookingHorizonDays: 30`, `status: "active"`
- if calendar `GET` returns `404` for a scheduled-slot resource, show an empty calendar form with empty typed arrays

Save behavior:

1. Saving the profile calls `PUT /api/v1/provider/resources/{resourceId}/availability-profile`.
2. The frontend sends the API-derived `availabilityMode`; do not let the user choose a mode that contradicts `capacityMode`.
3. After profile save, refresh diagnostics.
4. Saving calendar rules calls `PUT /api/v1/provider/resources/{resourceId}/availability-calendar` and then refreshes diagnostics.
5. Creating or closing slots uses the slot endpoints and then refreshes diagnostics.

Readiness behavior:

- use diagnostics for setup guidance, warnings, and publishability blockers
- do not present diagnostics as a promise that a specific future customer booking is available
- for inventory resources, availability readiness only proves the profile exists; rentable capacity comes from inventory units and variant setup
- for scheduled-slot resources, calendar and slots are execution configuration inputs, but booking-time validation remains the final source of truth

### Availability Profile

```http
GET /api/v1/provider/resources/{resourceId}/availability-profile
PUT /api/v1/provider/resources/{resourceId}/availability-profile
Authorization: Bearer <access_token>
```

Create or update request:

```json
{
  "availabilityMode": "inventory",
  "timezone": "Asia/Yekaterinburg",
  "bookingHorizonDays": 30,
  "status": "active"
}
```

Profile response:

```json
{
  "profileId": "10000000-0000-4000-8000-000000000001",
  "resourceId": "0a1a0000-0000-4000-8000-000000000101",
  "availabilityMode": "inventory",
  "timezone": "Asia/Yekaterinburg",
  "bookingHorizonDays": 30,
  "status": "active",
  "readiness": {
    "configurationStatus": "configured_profile_only",
    "slotSupportStatus": "not_applicable",
    "calendarSupportStatus": "not_applicable",
    "diagnosticsStatus": "pending_module"
  },
  "publishabilityImpact": {
    "status": "pending_module",
    "reason": "Availability profile exists; inventory units or scheduled slots provide execution capacity truth."
  },
  "updatedAt": "2026-05-18T10:00:00Z"
}
```

Frontend behavior:

- after creating a resource, show availability setup before offer creation/publishing checks
- prefill `timezone` from provider city/resource context when available; otherwise ask explicitly
- for equipment/inventory resources, the profile is the main availability form and capacity comes from inventory units and variants
- handle `404` as “profile not configured yet” on `GET`, but as “resource not found or not accessible” on `PUT`
- show API validation errors directly when there is no field-specific local copy

### Availability Calendar

```http
GET /api/v1/provider/resources/{resourceId}/availability-calendar
PUT /api/v1/provider/resources/{resourceId}/availability-calendar
Authorization: Bearer <access_token>
```

Calendar is currently supported only for `scheduled_slot` availability. Do not call it for inventory resources.

Upsert request:

```json
{
  "timezone": "Asia/Yekaterinburg",
  "recurringRules": [
    {
      "dayOfWeek": "saturday",
      "startsAtLocal": "10:00",
      "endsAtLocal": "12:00",
      "capacity": 8
    }
  ],
  "blockedPeriods": [
    {
      "startsAt": "2026-06-01T00:00:00+05:00",
      "endsAt": "2026-06-02T00:00:00+05:00",
      "reasonCode": "maintenance"
    }
  ],
  "exceptions": [
    {
      "date": "2026-06-12",
      "isClosed": true,
      "opensAtLocal": null,
      "closesAtLocal": null,
      "capacity": null
    }
  ]
}
```

Response echoes the same typed arrays plus `calendarId`, `resourceId`, `timezone`, and `updatedAt`.

Frontend behavior:

- render calendar only after an active `scheduled_slot` profile exists
- if `GET` returns `404`, show an empty calendar form rather than an error screen
- if `PUT` returns an error saying calendar is supported only for scheduled-slot resources, hide the calendar form and refresh the profile/resource
- keep recurring rules, blocked periods, and exceptions as typed objects; do not serialize nested JSON strings

### Resource Slots

```http
GET /api/v1/provider/resources/{resourceId}/slots
POST /api/v1/provider/resources/{resourceId}/slots
PATCH /api/v1/provider/resources/{resourceId}/slots/{slotId}
POST /api/v1/provider/resources/{resourceId}/slots/{slotId}/close
Authorization: Bearer <access_token>
```

Slots are for service/experience scheduled-slot resources. They are not used for equipment inventory resources.

Create request:

```json
{
  "startsAt": "2026-06-15T10:00:00+05:00",
  "endsAt": "2026-06-15T12:00:00+05:00",
  "totalCapacity": 8,
  "status": "open",
  "title": "Утренняя прогулка",
  "meetingPoint": "Пункт проката на Ленина"
}
```

Slot response:

```json
{
  "slotId": "20000000-0000-4000-8000-000000000001",
  "resourceId": "0a1a0000-0000-4000-8000-000000000101",
  "startsAt": "2026-06-15T10:00:00+05:00",
  "endsAt": "2026-06-15T12:00:00+05:00",
  "totalCapacity": 8,
  "reservedCapacity": 0,
  "availableCapacity": 8,
  "status": "open",
  "title": "Утренняя прогулка",
  "meetingPoint": "Пункт проката на Ленина",
  "createdAt": "2026-05-18T10:00:00Z",
  "updatedAt": "2026-05-18T10:00:00Z"
}
```

Slot rules:

- `endsAt` must be after `startsAt`
- `totalCapacity` must be greater than zero
- `totalCapacity` cannot be reduced below already reserved capacity
- status values are currently `open`, `closed`, and `cancelled`
- close uses `POST /close`; do not delete slots to make them unavailable

### Availability Diagnostics

```http
GET /api/v1/provider/resources/{resourceId}/availability-diagnostics
Authorization: Bearer <access_token>
```

Response:

```json
{
  "resourceId": "0a1a0000-0000-4000-8000-000000000101",
  "availabilityReady": true,
  "bookingRoutable": true,
  "modeValid": true,
  "errors": [],
  "warnings": [],
  "publishabilityImpact": [
    { "key": "status", "value": "configured_profile_only" },
    { "key": "reason", "value": "Availability runtime configuration is present for the current mode." }
  ],
  "checkedAt": "2026-05-18T10:00:00Z"
}
```

Frontend behavior:

- use diagnostics for setup/readiness UI and publishability guidance
- do not present diagnostics as a guarantee that a specific customer booking time is available
- show blocking states from `errors`; current error codes include `availability_profile_missing`, `availability_profile_inactive`, `availability_timezone_missing`, and `resource_slots_missing`
- show non-blocking warnings from `warnings`; current warning code includes `availability_calendar_missing`
- refresh diagnostics after profile, calendar, slot, inventory-unit, or resource-status changes

### Inventory Units

Inventory units are used only for equipment resources with `capacityMode: "inventory"`, such as bicycles. They are the provider's physical rentable units. Do not use calendar or slot APIs for these resources.

```http
GET /api/v1/provider/resources/{resourceId}/inventory-summary
GET /api/v1/provider/resources/{resourceId}/units
POST /api/v1/provider/resources/{resourceId}/units
PATCH /api/v1/provider/resources/{resourceId}/units/{unitId}
POST /api/v1/provider/resources/{resourceId}/units/{unitId}/archive
Authorization: Bearer <access_token>
```

Create request can stay intentionally small. Status and condition can be updated later:

```json
{
  "resourceVariantId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
  "inventoryCode": "BIKE-0001"
}
```

Current API defaults omitted `status` to `active`. Omitted `conditionStatus` means the unit exists but is not counted as ready until condition is set later.

Important current validation:

- active units must have `resourceVariantId`
- `inventoryCode` may contain only Latin letters, numbers, spaces, dashes, underscores, or dots
- do not rely on API-generated inventory codes while resource titles can contain Cyrillic; send an explicit code such as `BIKE-0001`
- show `inventoryCode` to providers as “Инвентарный номер”

Unit response:

```json
{
  "unitId": "50000000-0000-4000-8000-000000000001",
  "resourceId": "0a1a0000-0000-4000-8000-000000000101",
  "resourceVariantId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
  "inventoryCode": "BIKE-0001",
  "displayName": null,
  "status": "active",
  "conditionStatus": null,
  "externalReferenceCode": null,
  "createdAt": "2026-05-18T10:00:00Z",
  "updatedAt": "2026-05-18T10:00:00Z"
}
```

Inventory summary response:

```json
{
  "resourceId": "0a1a0000-0000-4000-8000-000000000101",
  "totalUnits": 1,
  "activeUnits": 1,
  "readyUnits": 0,
  "maintenanceUnits": 0,
  "damagedUnits": 0,
  "inactiveUnits": 0,
  "retiredUnits": 0,
  "lostUnits": 0,
  "classifiedUnits": 1,
  "unclassifiedUnits": 0,
  "variants": [
    {
      "resourceVariantId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
      "variantKey": "frame-m",
      "label": "Рама M",
      "status": "active",
      "totalUnits": 1,
      "activeUnits": 1,
      "readyUnits": 0,
      "maintenanceUnits": 0,
      "damagedUnits": 0,
      "updatedAt": "2026-05-18T10:00:00Z"
    }
  ],
  "updatedAt": "2026-05-18T10:00:00Z"
}
```

Frontend behavior:

- the quick-add unit form should ask only for variant/model and inventory code
- do not show or require `displayName` in the provider UI for now; treat it as an optional API field that can remain `null`
- expose status and condition in an edit/details flow, not as required fields on quick add
- show `readyUnits` as “готово к прокату”; a unit is counted ready only when `status: "active"`, `resourceVariantId` is present, and `conditionStatus: "ready"`
- if `readyUnits` is `0`, show setup guidance rather than treating availability diagnostics as proof that a bicycle can be rented

## Provider Pricing

Pricing is configured under `ProviderResource` by default. Offers may later add an offer-specific pricing override, but frontend should first configure the resource pricing policy because resource pricing is the normal publishability dependency for the current rental flow.

Do not put pricing truth into offer cards, availability diagnostics, or frontend-only state. Offer responses may expose pricing summaries as projections, but executable pricing comes from pricing policy and quote/preview logic.

### Resource Pricing Policy

```http
GET /api/v1/provider/resources/{resourceId}/pricing-policy
PUT /api/v1/provider/resources/{resourceId}/pricing-policy
Authorization: Bearer <access_token>
```

If `GET` returns `404`, treat it as “pricing is not configured yet” and show an empty pricing form. This is the API path that resolves provider-facing warnings such as `Pricing policy is required before the offer can be published.`

Create or update request for a simple hourly bicycle rental:

```json
{
  "pricingMode": "per_unit_time",
  "currency": "RUB",
  "baseAmount": 500,
  "adjustmentRules": [],
  "status": "active"
}
```

Pricing policy response:

```json
{
  "pricingPolicyId": "30000000-0000-4000-8000-000000000001",
  "resourceId": "0a1a0000-0000-4000-8000-000000000101",
  "offerId": null,
  "pricingMode": "per_unit_time",
  "currency": "RUB",
  "baseAmount": 500,
  "adjustmentRules": [],
  "status": "active",
  "readiness": {
    "quoteabilityStatus": "pending_module",
    "summaryPreviewStatus": "pending_module",
    "variantPricingStatus": "not_evaluated",
    "diagnosticsStatus": "pending_module"
  },
  "publishabilityImpact": {
    "status": "pending_module",
    "reason": "Pricing policy is persisted, but quote preview, summary preview, and diagnostics modules are still deferred."
  },
  "updatedAt": "2026-05-18T10:00:00Z"
}
```

Supported `pricingMode` values currently accepted by the API:

- `fixed`
- `per_unit_time`
- `per_participant`
- `tiered`
- `dynamic`

Supported `status` values:

- `draft`
- `active`
- `superseded`
- `archived`

Frontend behavior:

- for MVP bicycle rentals, default to `pricingMode: "per_unit_time"`, `currency: "RUB"`, `status: "active"`
- label `baseAmount` as “Цена” or “Цена за час” when `pricingMode` is `per_unit_time`; do not show API field names directly to providers
- after saving pricing, refresh pricing diagnostics and offer publishability/routability views
- do not treat pricing diagnostics as a customer-facing quote; use quote preview for calculated amounts

### Pricing Diagnostics

```http
GET /api/v1/provider/resources/{resourceId}/pricing-diagnostics
Authorization: Bearer <access_token>
```

Response:

```json
{
  "resourceId": "0a1a0000-0000-4000-8000-000000000101",
  "offerId": null,
  "pricingReady": true,
  "quoteable": true,
  "summaryReady": true,
  "errors": [],
  "warnings": [],
  "publishabilityImpact": [
    { "key": "status", "value": "partially_evaluated" },
    { "key": "reason", "value": "Pricing policy is configured, but deeper diagnostics and preview parity remain bootstrap-level." }
  ],
  "checkedAt": "2026-05-18T10:00:00Z"
}
```

Frontend behavior:

- show `pricing_policy_missing`, `pricing_policy_inactive`, and `pricing_currency_missing` as blocking setup issues
- show `pricing_base_amount_missing` and `pricing_adjustments_not_configured` as guidance/warnings
- use diagnostics for setup and publishability guidance only, not as pricing truth
- when diagnostics says pricing is missing, link the user to the resource pricing form

### Offer Pricing Override

```http
GET /api/v1/provider/offers/{offerId}/pricing-policy
PUT /api/v1/provider/offers/{offerId}/pricing-policy
Authorization: Bearer <access_token>
```

Use offer-level pricing only when an offer intentionally needs a different commercial price than the resource default, for example a promo, package, adult-only offer, or premium bundle.

Frontend behavior:

- default offer creation should rely on the resource pricing policy
- do not require an offer-level pricing policy when the resource policy is already active
- if offer-specific pricing is enabled in UI, make it clear that it overrides the resource-level price for that offer

### Pricing Previews

```http
POST /api/v1/provider/offers/{offerId}/pricing-summary-preview
POST /api/v1/provider/pricing/quote-preview
Authorization: Bearer <access_token>
```

Quote preview request:

```json
{
  "offerId": "40000000-0000-4000-8000-000000000001",
  "resourceId": null,
  "selectionContext": {
    "startAt": "2026-06-15T10:00:00+05:00",
    "endAt": "2026-06-15T12:00:00+05:00",
    "quantity": 1,
    "variantSelection": [],
    "bookingOptions": []
  }
}
```

Frontend behavior:

- use summary preview for offer cards/previews after an offer exists
- use quote preview when the provider needs to test a concrete booking interval and quantity
- quote preview is a provider-side calculation preview, not a booking reservation and not a guarantee that inventory will still be available later

## Provider Policy

Policy is the provider-authored business rules layer for rental/booking conditions. It answers questions such as minimum age, cancellation window, no-show charge, deposit percent, lead time, helmet requirement, weather exception, and check-in grace period.

Do not treat `policySummary`, offer cards, or diagnostics as policy truth. Policy truth is authored through the policy endpoints. Offer/customer-facing summaries are projections, and booking-time allow/block validation still happens in checkout.

Current inheritance model:

1. Provider default policy profile is the baseline for the provider.
2. Resource policy override specializes the baseline for one operational resource, for example bicycles.
3. Offer policy override specializes the chain for one commercial offer, for example a promo or special package.

For MVP bicycle rental, the frontend should first make sure the provider default policy exists and is active. Resource or offer overrides are optional and should only be shown when rules differ from the provider default.

### Provider Default Policy Profile

```http
GET /api/v1/provider/policy-profile
PUT /api/v1/provider/policy-profile
Authorization: Bearer <access_token>
```

If `GET` returns `404`, treat it as “rules are not configured yet” and show the default policy form. This is the primary path to resolve publishability/routability failures such as `policy_chain_missing` or `Provider or resource policy is required before the offer can be published.`

Create or update request:

```json
{
  "policyScope": "default",
  "leadTimeHours": 2,
  "cancellationWindowHours": 24,
  "isCancellationAllowed": true,
  "noShowChargePercent": 100,
  "depositPercent": 0,
  "checkInGraceMinutes": 15,
  "assuranceMode": "none",
  "weatherException": false,
  "minimumAge": 18,
  "helmetRequired": true,
  "status": "active"
}
```

Policy profile response:

```json
{
  "policyProfileId": "70000000-0000-4000-8000-000000000001",
  "ownerType": "provider",
  "ownerId": "00000000-0000-0000-0000-000000000010",
  "policyScope": "default",
  "leadTimeHours": 2,
  "cancellationWindowHours": 24,
  "isCancellationAllowed": true,
  "noShowChargePercent": 100,
  "depositPercent": 0,
  "checkInGraceMinutes": 15,
  "assuranceMode": "none",
  "weatherException": false,
  "minimumAge": 18,
  "helmetRequired": true,
  "status": "active",
  "readiness": {
    "authoringStatus": "configured",
    "summaryPreviewStatus": "pending_module",
    "effectivePreviewStatus": "pending_module",
    "diagnosticsStatus": "pending_module"
  },
  "publishabilityImpact": {
    "status": "pending_module",
    "reason": "Provider default policy exists, but policy summary preview and diagnostics are bootstrap-level."
  },
  "updatedAt": "2026-05-18T10:00:00Z"
}
```

Current accepted `policyScope` values:

- `default`
- `booking`
- `cancellation`
- `assurance`
- `eligibility`
- `fulfillment`

Current accepted provider policy `status` values:

- `draft`
- `active`
- `superseded`
- `archived`

Frontend behavior:

- label this module as “Правила проката” or “Условия бронирования”, not “Policy”
- for normal bicycle rental, default to `policyScope: "default"` and `status: "active"`
- at least one rule field must be present; the API rejects an empty ruleset
- hide advanced scope selection in the main MVP form unless the provider intentionally configures specialized rules
- after saving, refresh policy diagnostics plus offer publishability/routability views

Suggested MVP fields for a simple provider form:

- `minimumAge`: “Минимальный возраст”
- `helmetRequired`: “Шлем обязателен”
- `leadTimeHours`: “За сколько часов можно забронировать”
- `cancellationWindowHours`: “За сколько часов можно отменить”
- `isCancellationAllowed`: “Отмена разрешена”
- `noShowChargePercent`: “Штраф за неявку, %”
- `depositPercent`: “Залог, %”
- `weatherException`: “Исключение из-за погоды”
- `checkInGraceMinutes`: “Допустимое опоздание, минут”

### Resource Policy Override

```http
GET /api/v1/provider/resources/{resourceId}/policy
PUT /api/v1/provider/resources/{resourceId}/policy
Authorization: Bearer <access_token>
```

Use resource policy override only when one resource needs rules different from the provider default. For example, bicycles may require helmets and a minimum age, while another resource type may not.

Create or update request:

```json
{
  "overrideScope": "eligibility",
  "minimumAge": 16,
  "helmetRequired": true,
  "status": "active"
}
```

Current accepted `overrideScope` values:

- `assurance`
- `duration`
- `cancellation`
- `eligibility`
- `prerequisites`
- `fulfillment`

Current accepted override `status` values:

- `active`
- `superseded`
- `archived`

Frontend behavior:

- if `GET` returns `404`, show “uses provider default rules” rather than an error
- do not force every resource to have an override
- when the user creates an override, explain that only filled fields are the resource-specific rule set in the current API response; the effective chain is inspected through diagnostics/preview

### Offer Policy Override

```http
GET /api/v1/provider/offers/{offerId}/policy
PUT /api/v1/provider/offers/{offerId}/policy
Authorization: Bearer <access_token>
```

Use offer policy override only when the commercial offer needs different rules from the provider/resource default, for example a promo with different cancellation or deposit terms.

Frontend behavior:

- do not create offer policy overrides by default
- if `GET` returns `404`, show “uses provider/resource rules” rather than an error
- after saving an offer override, refresh the offer detail/list projection and policy summary preview

### Policy Diagnostics And Preview

```http
GET /api/v1/provider/resources/{resourceId}/policy-diagnostics
POST /api/v1/provider/policy/effective-preview
POST /api/v1/provider/offers/{offerId}/policy-summary-preview
Authorization: Bearer <access_token>
```

Effective preview request:

```json
{
  "ownerType": "resource",
  "ownerId": "0a1a0000-0000-4000-8000-000000000101"
}
```

Diagnostics response:

```json
{
  "ownerType": "resource",
  "ownerId": "0a1a0000-0000-4000-8000-000000000101",
  "effectiveChain": [
    { "key": "provider_profile_status", "value": "active" },
    { "key": "resource_override_status", "value": null },
    { "key": "offer_override_status", "value": null }
  ],
  "validationReady": true,
  "summaryReady": true,
  "errors": [],
  "warnings": [
    "effective_policy_preview_bootstrap",
    "policy_summary_projection_bootstrap"
  ],
  "publishabilityImpact": [
    { "key": "status", "value": "partially_evaluated" },
    { "key": "reason", "value": "Policy chain is present, but effective preview remains bootstrap-level." }
  ],
  "checkedAt": "2026-05-18T10:00:00Z"
}
```

Frontend behavior:

- show `provider_policy_missing` and `provider_policy_inactive` as blocking setup issues
- show `resource_policy_override_inactive` and `offer_policy_override_inactive` as warnings unless publishability/routability says otherwise
- show bootstrap warnings as technical setup notes or hide them from normal providers; they are not actionable business problems
- use policy diagnostics for setup/readiness guidance only, not as a booking guarantee
- use policy summary preview for provider-facing preview of customer-visible policy text/summary after an offer exists

### Policy Options

Current API does not expose a policy options endpoint. For the MVP, frontend may use the documented enum values above and conservative defaults for the bicycle rental form.

An options endpoint would still be useful before this UI becomes broader than the bicycle rental MVP, because the frontend needs localized labels, field descriptions, allowed scopes, statuses, and recommended defaults without hardcoding product policy choices.

Recommended future endpoint:

```http
GET /api/v1/provider/policy-options
Authorization: Bearer <access_token>
```

Recommended response shape:

```json
{
  "policyScopes": [
    { "value": "default", "title": "Общие правила", "isDefault": true }
  ],
  "overrideScopes": [
    { "value": "eligibility", "title": "Ограничения и требования" }
  ],
  "statuses": [
    { "value": "active", "title": "Активно", "isDefault": true }
  ],
  "fields": [
    {
      "key": "minimumAge",
      "title": "Минимальный возраст",
      "inputType": "number",
      "min": 0,
      "recommendedValue": 18
    }
  ],
  "defaults": {
    "policyScope": "default",
    "status": "active",
    "leadTimeHours": 2,
    "cancellationWindowHours": 24
  }
}
```

Until this endpoint exists, do not call it from the frontend. Keep policy labels/defaults local to the provider web app and revisit after policy requirements grow.

## Provider Offers

Offer creation forms must load supported options from the API instead of hardcoding enum strings.

```http
GET /api/v1/provider/offers/authoring-options
GET /api/v1/provider/offers/authoring-options?primaryResourceId={resourceId}
Authorization: Bearer <access_token>
```

Use the resource-aware call after the user selects a primary resource. For an equipment/inventory resource, the current default offer type is `rental`.

Response shape:

```json
{
  "offerTypes": [
    {
      "value": "rental",
      "title": "Прокат",
      "description": "Аренда оборудования или инвентаря.",
      "isDefault": true
    }
  ],
  "bookingFlowTypes": [
    {
      "value": "direct_checkout",
      "title": "Прямая оплата",
      "description": "Клиент может оформить заказ без ручного подтверждения.",
      "isDefault": true
    }
  ],
  "variantExposureModes": [
    {
      "value": "all_active_variants",
      "title": "Все активные варианты",
      "description": "Оффер использует все активные варианты ресурса.",
      "isDefault": true
    }
  ],
  "defaults": {
    "offerType": "rental",
    "bookingFlowType": "direct_checkout",
    "variantExposureMode": "all_active_variants"
  },
  "resourceCompatibility": {
    "resourceId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
    "resourceType": "equipment",
    "capacityMode": "inventory",
    "recommendedOfferTypes": ["rental"],
    "defaultOfferType": "rental"
  }
}
```

Create request:

```http
POST /api/v1/provider/offers
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "primaryResourceId": "0a1a0000-0000-4000-8000-000000000101",
  "offerType": "rental",
  "bookingFlowType": "direct_checkout",
  "variantExposureMode": "all_active_variants",
  "title": "Прокат велосипеда Stels Miss 6500",
  "description": null,
  "locationRef": null
}
```

To create an offer that exposes only specific variants, load variants first:

```http
GET /api/v1/provider/resources/{resourceId}/variants
Authorization: Bearer <access_token>
```

Then submit selected exposures in the same create request:

```json
{
  "primaryResourceId": "0a1a0000-0000-4000-8000-000000000101",
  "offerType": "rental",
  "bookingFlowType": "direct_checkout",
  "variantExposureMode": "selected_variants_only",
  "title": "Прокат взрослого велосипеда",
  "selectedVariants": [
    {
      "variantId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
      "visibilityStatus": "visible",
      "sortOrder": 0
    }
  ]
}
```

Variant exposure rules:

- use `all_active_variants` when the offer should include every active variant of the resource
- use `selected_variants_only` when the offer is a package/filter such as adult-only, kids-only, premium-only, or promo-only
- `selectedVariants` is accepted only with `selected_variants_only`
- selected variants must belong to the primary resource
- selected variants are booking-required by default
- `visibilityStatus` values: `visible`, `hidden`, `unavailable`
- the older two-step flow still works: create the offer, then call `PUT /api/v1/provider/offers/{offerId}/variants/{variantId}/exposure`

Frontend rules:

- send option `value`, never `title`
- default from `defaults` or `resourceCompatibility.defaultOfferType`
- do not invent values such as `bike`, `equipment`, or `inventory`
- if API returns `Unsupported offer_type`, refresh authoring options and block submit until a supported value is selected

### Delete Resource

```http
DELETE /api/v1/provider/resources/{resourceId}
Authorization: Bearer <access_token>
```

Swagger response contract:

- `204 No Content`: resource was deleted
- `401 Unauthorized`: user/session/token is not authorized

Frontend behavior:

- expose deletion from the resource detail danger zone
- ask for explicit confirmation before calling delete
- on `204`, remove the resource from local list state and navigate back to `/resources`
- if the API returns `404`, show that the resource is missing or not available to the current provider
- if the API returns `409`, do not retry deletion; offer archive instead because the resource is already linked to offers, reservations, or fulfillment records

Current client wiring:

- `resourcesApi.remove(resourceId)` calls `DELETE /api/v1/provider/resources/{resourceId}`
- `ResourceDetail` renders the delete action in the danger zone
- `ResourcePage.handleRemove` handles success plus `404` and `409` provider-facing errors

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

- [ ] email-start screen
- [ ] email-start API client method
- [ ] check-email screen
- [ ] registration invitation context API client method
- [ ] token-based registration screen
- [ ] token-based registration API client method
- [ ] magic-sign-in callback route
- [ ] magic-sign-in API client method
- [ ] dev email outbox helper for local development
- [ ] invalid or expired invitation/magic token state
- [ ] legacy verify-email callback only if password registration remains exposed
- [ ] legacy resend verification action only if password registration remains exposed

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
        "taxNumber"
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

- `registeredAddress` is the legal registration address and belongs to onboarding/legal identity for ИП and organizations; it is not required for `self_employed`.
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
