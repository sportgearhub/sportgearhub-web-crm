import type {
  Provider,
  AuthUser,
  ProviderMembership,
  DashboardResponse,
  OnboardingResponse,
  Resource,
  AvailabilityProfile,
  AvailabilityCalendar,
  CapacitySlot,
  AvailabilityDiagnostics,
  ResourceVariant,
  VariantAllocation,
  PricingPolicy,
  PricingQuotePreview,
  PricingDiagnostics,
  ProviderPolicy,
  PolicyDiagnostics,
  Offer,
  OfferVariantExposure,
  OfferRoutability,
  OfferPublishability,
  BookingListItem,
  BookingDetail,
  BookingStatus,
  FulfillmentCommandResult,
  AcquiringConnection,
  AcquiringOnboardingPayload,
  ResourceStatus,
  OfferStatus,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const AUTH_APP = 'crm';
const AUTH_CLIENT_ID = 'sportgearhub-provider';
const PROVIDER_AUTH_SCOPE = 'openid profile email offline_access roles provider_api';
const PUBLIC_AUTH_SCOPE = 'openid profile email offline_access roles public_api';
const TOKEN_STORAGE_KEY = 'sportgearhub.provider.oidc';
const PROVIDER_BASE_URL = '/api/v1/provider';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type ApiUser = {
  id?: string;
  userId?: string;
  email?: string | null;
  name?: string | null;
  surname?: string | null;
  roles?: string[];
  role?: string;
  emailVerified?: boolean;
};

type ApiResource = {
  resourceId?: string;
  providerId?: string;
  resourceType?: string;
  status?: string;
  capacityMode?: string;
  title?: string | null;
  baseCapacity?: number | null;
  readiness?: unknown;
  publishabilityImpact?: unknown;
  createdAt?: string;
  updatedAt?: string;
};

export type EquipmentCategory = {
  categoryId: string;
  slug: string;
  label: string;
  labels: Record<string, string>;
  resourceType: string;
  capacityMode: string;
  status: string;
  sortOrder: number;
};

export type EquipmentAttributeAllowedValue = {
  allowedValueId: string;
  valueKey: string;
  valueString?: string | null;
  valueDecimal?: number | null;
  valueInt?: number | null;
  valueBool?: boolean | null;
  label: string;
  labels: Record<string, string>;
  sortOrder: number;
};

export type EquipmentAttributeVisibilityCondition = {
  attributeKey: string;
  allowedValueKeys: string[];
};

export type EquipmentAttribute = {
  attributeId: string;
  key: string;
  label: string;
  labels: Record<string, string>;
  valueType: string;
  unit?: string | null;
  unitLabel?: string | null;
  referenceType?: string | null;
  requiredOn: string[];
  appliesTo: string[];
  visibleWhen: EquipmentAttributeVisibilityCondition[];
  filterable: boolean;
  comparable: boolean;
  searchable: boolean;
  sortOrder: number;
  allowedValues: EquipmentAttributeAllowedValue[];
};

export type EquipmentAttributeSchema = {
  category: EquipmentCategory;
  attributes: EquipmentAttribute[];
};

export type EquipmentBrandSuggestion = {
  brandId: string;
  canonicalName: string;
  status: string;
  confidence: number;
  matchKind: string;
};

export type EquipmentBrand = {
  brandId: string;
  canonicalName: string;
  status: string;
  website?: string | null;
  countryCode?: string | null;
};

export type CreateEquipmentBrandResponse = {
  status: string;
  brand: EquipmentBrand;
  matches: EquipmentBrandSuggestion[];
};

type OidcTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
};

type StoredOidcToken = OidcTokenResponse & {
  obtained_at: number;
  expires_at: number;
  scope: string;
};

export type OnboardingChecklistValue = 'missing' | 'ready';
export type OnboardingStatus =
  | 'not_started'
  | 'draft'
  | 'changes_requested'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type ProviderOnboardingDraft = {
  displayName: string | null;
  legalName: string | null;
  legalCountryCode: string | null;
  legalForm: string | null;
  taxNumber: string | null;
  registrationNumber: string | null;
  branchNumber: string | null;
  registeredAddress: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  city: string | null;
  address: string | null;
  description: string | null;
};

export type ProviderOnboarding = {
  applicationId: string | null;
  providerId: string | null;
  status: OnboardingStatus;
  checklist: {
    profile: OnboardingChecklistValue;
    legal: OnboardingChecklistValue;
  } | null;
  draft: ProviderOnboardingDraft | null;
  updatedAt: string;
};

export type OnboardingLegalFormOption = {
  value: string;
  label: string;
  requiredLegalIdentityFields: Array<keyof ProviderOnboardingDraft>;
};

export type ProviderOnboardingOptions = {
  legalCountries: Array<{ value: string; label: string }>;
  legalForms: OnboardingLegalFormOption[];
};

function normalizeUser(user: ApiUser): AuthUser {
  const roles = user.roles ?? (user.role ? [user.role] : ['User']);
  const email = user.email ?? '';
  const name = user.name && user.surname ? `${user.name} ${user.surname}` : user.name ?? email;

  return {
    id: user.userId ?? user.id ?? email,
    email,
    name,
    role: roles[0] ?? 'User',
    roles,
    emailVerified: user.emailVerified,
  };
}

function normalizeResource(resource: ApiResource): Resource {
  const resourceId = resource.resourceId ?? '';
  const title = resource.title ?? 'Untitled resource';
  const status = ['active', 'inactive', 'archived', 'draft'].includes(resource.status ?? '')
    ? resource.status as ResourceStatus
    : 'draft';
  const updatedAt = resource.updatedAt ?? new Date().toISOString();
  const resourceType = resource.resourceType ?? 'equipment';

  return {
    resourceId,
    providerId: resource.providerId,
    resourceType,
    capacityMode: resource.capacityMode,
    status,
    title,
    baseCapacity: resource.baseCapacity ?? 0,
    readiness: (resource.readiness ?? {
      capabilityValid: false,
      availabilityReady: false,
      pricingReady: false,
      policyReady: false,
      variantReady: false,
      offerAuthoringReady: false,
      errors: [],
    }) as Resource['readiness'],
    publishabilityImpact: (resource.publishabilityImpact ?? {
      publishable: false,
      reasonCodes: [],
    }) as Resource['publishabilityImpact'],
    createdAt: resource.createdAt,
    updatedAt,
    id: resourceId,
    slug: resourceId,
    categoryName: resourceType === 'equipment' ? 'Equipment' : resourceType,
    variantCount: 0,
  };
}

function loadStoredToken(): StoredOidcToken | null {
  try {
    const rawToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!rawToken) return null;

    const token = JSON.parse(rawToken) as Partial<StoredOidcToken>;
    if (!token.access_token || !token.expires_at) return null;

    return token as StoredOidcToken;
  } catch {
    return null;
  }
}

let authToken: StoredOidcToken | null = typeof window === 'undefined' ? null : loadStoredToken();

function storeToken(token: OidcTokenResponse, scope: string) {
  const obtainedAt = Date.now();
  authToken = {
    ...token,
    obtained_at: obtainedAt,
    expires_at: obtainedAt + token.expires_in * 1000,
    scope,
  };

  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(authToken));
  } catch {
    // In private or restricted storage contexts, keep the token for this tab only.
  }
}

function clearStoredToken() {
  authToken = null;
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Storage may be unavailable; in-memory token state is already cleared.
  }
}

async function oidcTokenRequest(body: URLSearchParams, scope: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(
      res.status,
      err.error_description || err.error || err.message || err.title || `API error ${res.status}`
    );
  }

  const token = await res.json() as OidcTokenResponse;
  storeToken(token, scope);
  return token;
}

async function passwordGrant(email: string, password: string, scope: string) {
  return oidcTokenRequest(new URLSearchParams({
    grant_type: 'password',
    client_id: AUTH_CLIENT_ID,
    username: email,
    password,
    scope,
  }), scope);
}

async function refreshGrant(token: StoredOidcToken) {
  if (!token.refresh_token) {
    clearStoredToken();
    return null;
  }

  try {
    return await oidcTokenRequest(new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: AUTH_CLIENT_ID,
      refresh_token: token.refresh_token,
      scope: token.scope || PROVIDER_AUTH_SCOPE,
    }), token.scope || PROVIDER_AUTH_SCOPE);
  } catch {
    clearStoredToken();
    return null;
  }
}

async function getAccessToken() {
  if (!authToken) return null;

  const refreshSkewMs = 30_000;
  if (authToken.expires_at - refreshSkewMs > Date.now()) {
    return authToken.access_token;
  }

  const refreshed = await refreshGrant(authToken);
  return refreshed?.access_token ?? null;
}

function shouldRetryWithPublicScope(error: unknown) {
  if (!(error instanceof ApiError)) return false;

  const message = error.message.toLowerCase();
  return error.status === 400 && (
    message.includes('scope') ||
    message.includes('provider_api') ||
    message.includes('insufficient')
  );
}

type ApiRequestInit = RequestInit & { auth?: boolean };

async function request<T>(path: string, options: ApiRequestInit = {}): Promise<T> {
  const { auth = true, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);
  const accessToken = auth ? await getAccessToken() : null;

  if (fetchOptions.body && !headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'omit',
    ...fetchOptions,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    if (auth && res.status === 401) {
      clearStoredToken();
    }
    throw new ApiError(res.status, err.message || err.title || `API error ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

function providerRequest<T>(path: string, options: RequestInit = {}) {
  return request<T>(`${PROVIDER_BASE_URL}${path}`, options);
}

export const authApi = {
  login: async (email: string, password: string) => {
    try {
      await passwordGrant(email, password, PROVIDER_AUTH_SCOPE);
    } catch (error) {
      if (!shouldRetryWithPublicScope(error)) throw error;
      await passwordGrant(email, password, PUBLIC_AUTH_SCOPE);
    }

    return normalizeUser(await request<ApiUser>('/api/v1/auth/me'));
  },
  me: async () => normalizeUser(await request<ApiUser>('/api/v1/auth/me')),
  register: async (data: { name: string; surname: string; email: string; password: string }) =>
    normalizeUser(await request<ApiUser>('/api/v1/auth/register', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ ...data, app: AUTH_APP }),
    })),
  verifyEmail: (token: string) =>
    request<void>('/api/v1/auth/email/verify', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ token }),
    }),
  resendVerification: (email: string) =>
    request<void>('/api/v1/auth/email/verification', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, app: AUTH_APP }),
    }),
  forgotPassword: (email: string) =>
    request<void>('/api/v1/auth/password/forgot', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, app: AUTH_APP }),
    }),
  resetPassword: (token: string, newPassword: string) =>
    request<void>('/api/v1/auth/password/reset', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ token, newPassword }),
    }),
  signout: async () => {
    try {
      await request<void>('/api/v1/auth/signout', { method: 'POST' });
    } finally {
      clearStoredToken();
    }
  },
  providerMemberships: async () =>
    (await request<{ memberships: ProviderMembership[] }>('/api/v1/auth/provider-memberships')).memberships,
  googleStart: () => `${API_BASE_URL}/api/v1/auth/oauth/google/start`,
  yandexStart: () => `${API_BASE_URL}/api/v1/auth/oauth/yandex/start`,
  devEmails: () => `${API_BASE_URL}/api/v1/development/emails`,
};

export const providerOnboardingApi = {
  options: () => request<ProviderOnboardingOptions>('/api/v1/provider-onboarding/options'),
  current: () => request<ProviderOnboarding>('/api/v1/provider-onboarding/current'),
  create: () =>
    request<ProviderOnboarding>('/api/v1/provider-onboarding/current', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  updateProfile: (data: Partial<ProviderOnboardingDraft>) =>
    request<ProviderOnboarding>('/api/v1/provider-onboarding/current/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  submit: () =>
    request<ProviderOnboarding>('/api/v1/provider-onboarding/current/submit', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
};

// ─── Profile & Dashboard ──────────────────────────────────────────────────────

export const dashboardApi = {
  get: () => providerRequest<DashboardResponse>('/dashboard'),
};

export const profileApi = {
  get: () => providerRequest<Provider>('/profile'),

  patch: (data: {
    displayName?: string;
    legalName?: string;
    contactEmail?: string;
    contactPhone?: string;
    city?: string;
    addressLine?: string;
    description?: string;
  }) => providerRequest<Provider>('/profile', { method: 'PATCH', body: JSON.stringify(data) }),

  getOperatingState: () => providerRequest<Provider['operatingState']>('/operating-state'),

  getOnboarding: () => providerRequest<OnboardingResponse>('/onboarding'),

  submitOnboarding: (note: string) =>
    providerRequest<OnboardingResponse>('/onboarding/submit', {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
};

// ─── Resources ────────────────────────────────────────────────────────────────

export const resourcesApi = {
  list: async () => (await providerRequest<ApiResource[]>('/resources')).map(normalizeResource),

  create: (data: {
    resourceType: string;
    capacityMode: string;
    title: string;
    baseCapacity: number;
  }) => providerRequest<ApiResource>('/resources', { method: 'POST', body: JSON.stringify(data) }).then(normalizeResource),

  get: (resourceId: string) => providerRequest<ApiResource>(`/resources/${resourceId}`).then(normalizeResource),

  patch: (
    resourceId: string,
    data: { status?: ResourceStatus; title?: string; baseCapacity?: number }
  ) =>
    providerRequest<ApiResource>(`/resources/${resourceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then(normalizeResource),

  archive: (resourceId: string, reasonCode: string) =>
    providerRequest<ApiResource>(`/resources/${resourceId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ reasonCode }),
    }).then(normalizeResource),

  getRoutabilityImpact: (resourceId: string) =>
    providerRequest<{
      downstreamOfferCount: number;
      impactedOfferCount: number;
      status: string;
      dominantReasonCodes: string[];
      warnings: string[];
      issues: string[];
    }>(`/resources/${resourceId}/routability-impact`),
};

export const equipmentApi = {
  categories: (locale = 'ru-RU') =>
    providerRequest<EquipmentCategory[]>(`/equipment-categories?locale=${encodeURIComponent(locale)}`),

  categoryAttributes: (categorySlug: string, locale = 'ru-RU') =>
    providerRequest<EquipmentAttributeSchema>(
      `/equipment-categories/${encodeURIComponent(categorySlug)}/attributes?locale=${encodeURIComponent(locale)}`
    ),

  brandSuggestions: (query: string, category?: string) => {
    const params = new URLSearchParams({ query });
    if (category) params.set('category', category);
    return providerRequest<{ items: EquipmentBrandSuggestion[] }>(`/equipment-brands/suggestions?${params}`);
  },

  createBrand: (data: { name: string; category?: string | null; website?: string | null; countryCode?: string | null }) =>
    providerRequest<CreateEquipmentBrandResponse>('/equipment-brands', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── Availability ─────────────────────────────────────────────────────────────

export const availabilityApi = {
  getProfile: (resourceId: string) =>
    providerRequest<AvailabilityProfile>(`/resources/${resourceId}/availability-profile`),

  putProfile: (
    resourceId: string,
    data: {
      availabilityMode: string;
      timezone: string;
      bookingHorizonDays: number;
      status: string;
    }
  ) =>
    providerRequest<AvailabilityProfile>(`/resources/${resourceId}/availability-profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getCalendar: (resourceId: string) =>
    providerRequest<AvailabilityCalendar>(`/resources/${resourceId}/availability-calendar`),

  putCalendar: (
    resourceId: string,
    data: {
      timezone: string;
      recurringRules: AvailabilityCalendar['recurringRules'];
      blockedPeriods: AvailabilityCalendar['blockedPeriods'];
      exceptions: unknown[];
    }
  ) =>
    providerRequest<AvailabilityCalendar>(`/resources/${resourceId}/availability-calendar`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  listSlots: (
    resourceId: string,
    params: { dateFrom?: string; dateTo?: string; status?: string }
  ) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, v));
    return providerRequest<CapacitySlot[]>(`/resources/${resourceId}/capacity-slots?${qs}`);
  },

  createSlot: (
    resourceId: string,
    data: {
      startsAt: string;
      endsAt: string;
      totalCapacity: number;
      status: string;
      bookingSubjectRef?: CapacitySlot['bookingSubjectRef'];
    }
  ) =>
    providerRequest<CapacitySlot>(`/resources/${resourceId}/capacity-slots`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  patchSlot: (resourceId: string, slotId: string, data: Partial<CapacitySlot>) =>
    providerRequest<CapacitySlot>(`/resources/${resourceId}/capacity-slots/${slotId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  closeSlot: (resourceId: string, slotId: string) =>
    providerRequest<CapacitySlot>(`/resources/${resourceId}/capacity-slots/${slotId}/close`, {
      method: 'POST',
    }),

  getDiagnostics: (resourceId: string) =>
    providerRequest<AvailabilityDiagnostics>(`/resources/${resourceId}/availability-diagnostics`),
};

// ─── Variants ─────────────────────────────────────────────────────────────────

export const variantsApi = {
  list: (resourceId: string) =>
    providerRequest<ResourceVariant[]>(`/resources/${resourceId}/variants`),

  create: (
    resourceId: string,
    data: {
      variantKey: string;
      variantType: string;
      label: string;
      normalizedAttributes: ResourceVariant['normalizedAttributes'];
      sortOrder: number;
      status: string;
    }
  ) =>
    providerRequest<ResourceVariant>(`/resources/${resourceId}/variants`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (resourceId: string, variantId: string) =>
    providerRequest<ResourceVariant>(`/resources/${resourceId}/variants/${variantId}`),

  patch: (
    resourceId: string,
    variantId: string,
    data: Partial<Pick<ResourceVariant, 'label' | 'variantKey' | 'variantType' | 'normalizedAttributes' | 'sortOrder' | 'status'>>
  ) =>
    providerRequest<ResourceVariant>(`/resources/${resourceId}/variants/${variantId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  archive: (resourceId: string, variantId: string) =>
    providerRequest<ResourceVariant>(`/resources/${resourceId}/variants/${variantId}/archive`, {
      method: 'POST',
    }),

  getAllocation: (resourceId: string, variantId: string) =>
    providerRequest<VariantAllocation>(`/resources/${resourceId}/variants/${variantId}/allocation`),

  putAllocation: (resourceId: string, variantId: string, data: VariantAllocation) =>
    providerRequest<VariantAllocation>(`/resources/${resourceId}/variants/${variantId}/allocation`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getDiagnostics: (resourceId: string, variantId: string) =>
    providerRequest<Record<string, unknown>>(
      `/resources/${resourceId}/variants/${variantId}/diagnostics`
    ),
};

// ─── Pricing ──────────────────────────────────────────────────────────────────

export const pricingApi = {
  getResourcePolicy: (resourceId: string) =>
    providerRequest<PricingPolicy>(`/resources/${resourceId}/pricing-policy`),

  putResourcePolicy: (
    resourceId: string,
    data: {
      pricingMode: string;
      currency: string;
      unitRules: PricingPolicy['unitRules'];
      adjustmentRules: PricingPolicy['adjustmentRules'];
      status: string;
    }
  ) =>
    providerRequest<PricingPolicy>(`/resources/${resourceId}/pricing-policy`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getResourceDiagnostics: (resourceId: string) =>
    providerRequest<PricingDiagnostics>(`/resources/${resourceId}/pricing-diagnostics`),

  quotePreview: (data: {
    offerId?: string;
    resourceId?: string | null;
    selectionContext: {
      startAt: string;
      endAt: string;
      quantity: number;
    };
  }) =>
    providerRequest<PricingQuotePreview>('/pricing/quote-preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOfferPolicy: (offerId: string) =>
    providerRequest<PricingPolicy>(`/offers/${offerId}/pricing-policy`),

  putOfferPolicy: (
    offerId: string,
    data: {
      pricingMode: string;
      currency: string;
      unitRules: PricingPolicy['unitRules'];
      adjustmentRules: PricingPolicy['adjustmentRules'];
      status: string;
    }
  ) =>
    providerRequest<PricingPolicy>(`/offers/${offerId}/pricing-policy`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  offerPricingSummaryPreview: (offerId: string) =>
    providerRequest<Record<string, unknown>>(`/offers/${offerId}/pricing-summary-preview`, {
      method: 'POST',
    }),
};

// ─── Policy ───────────────────────────────────────────────────────────────────

export const policyApi = {
  getProfile: () => providerRequest<ProviderPolicy>('/policy-profile'),

  putProfile: (data: {
    policyScope: string;
    ruleset: ProviderPolicy['ruleset'];
    status: string;
  }) =>
    providerRequest<ProviderPolicy>('/policy-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getResourcePolicy: (resourceId: string) =>
    providerRequest<ProviderPolicy>(`/resources/${resourceId}/policy`),

  putResourcePolicy: (
    resourceId: string,
    data: {
      overrideScope: string;
      overrideRules: ProviderPolicy['ruleset'];
      status: string;
    }
  ) =>
    providerRequest<ProviderPolicy>(`/resources/${resourceId}/policy`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  offerPolicySummaryPreview: (offerId: string) =>
    providerRequest<Record<string, unknown>>(`/offers/${offerId}/policy-summary-preview`, {
      method: 'POST',
    }),

  getResourceDiagnostics: (resourceId: string) =>
    providerRequest<PolicyDiagnostics>(`/resources/${resourceId}/policy-diagnostics`),

  getOfferPolicy: (offerId: string) =>
    providerRequest<ProviderPolicy>(`/offers/${offerId}/policy`),

  putOfferPolicy: (
    offerId: string,
    data: {
      overrideScope: string;
      overrideRules: ProviderPolicy['ruleset'];
      status: string;
    }
  ) =>
    providerRequest<ProviderPolicy>(`/offers/${offerId}/policy`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ─── Offers ───────────────────────────────────────────────────────────────────

export const offersApi = {
  list: () => providerRequest<Offer[]>('/offers'),

  create: (data: {
    primaryResourceId: string;
    offerType: string;
    bookingFlowType: string;
    title: string;
    subtitle?: string;
    description?: string;
    locationRef?: Offer['locationRef'];
    includedItems?: Offer['includedItems'];
    requiredItems?: Offer['requiredItems'];
    mediaRefs?: Offer['mediaRefs'];
  }) => providerRequest<Offer>('/offers', { method: 'POST', body: JSON.stringify(data) }),

  get: (offerId: string) => providerRequest<Offer>(`/offers/${offerId}`),

  patch: (
    offerId: string,
    data: {
      title?: string;
      subtitle?: string;
      description?: string;
      locationRef?: Offer['locationRef'];
      includedItems?: Offer['includedItems'];
      requiredItems?: Offer['requiredItems'];
      mediaRefs?: Offer['mediaRefs'];
    }
  ) => providerRequest<Offer>(`/offers/${offerId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  checkPublishability: (offerId: string) =>
    providerRequest<OfferPublishability>(`/offers/${offerId}/check-publishability`, {
      method: 'POST',
    }),

  activate: (offerId: string) =>
    providerRequest<Offer>(`/offers/${offerId}/activate`, { method: 'POST' }),

  deactivate: (offerId: string) =>
    providerRequest<Offer>(`/offers/${offerId}/deactivate`, { method: 'POST' }),

  archive: (offerId: string, reasonCode: string) =>
    providerRequest<Offer>(`/offers/${offerId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ reasonCode }),
    }),

  getVariantExposure: (offerId: string) =>
    providerRequest<OfferVariantExposure>(`/offers/${offerId}/variant-exposure`),

  putVariantExposure: (offerId: string, data: OfferVariantExposure) =>
    providerRequest<OfferVariantExposure>(`/offers/${offerId}/variant-exposure`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getRoutability: (offerId: string) =>
    providerRequest<OfferRoutability>(`/offers/${offerId}/routability`),

  listRoutability: () => providerRequest<OfferRoutability[]>('/offers/routability'),
};

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const bookingsApi = {
  list: (params: {
    status?: BookingStatus;
    dateFrom?: string;
    dateTo?: string;
    offerId?: string;
    resourceId?: string;
  }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)));
    return providerRequest<BookingListItem[]>(`/bookings?${qs}`);
  },

  get: (bookingId: string) => providerRequest<BookingDetail>(`/bookings/${bookingId}`),

  getFulfillment: (bookingId: string) =>
    providerRequest<Record<string, unknown>>(`/bookings/${bookingId}/fulfillment`),

  handover: (
    bookingId: string,
    data: {
      handedOverAt: string;
      note?: string;
      handoverMetadata?: { key: string; value: string }[];
    }
  ) =>
    providerRequest<FulfillmentCommandResult>(`/bookings/${bookingId}/handover`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  return: (
    bookingId: string,
    data: {
      returnedAt: string;
      conditionSummary?: { key: string; value: string }[];
      note?: string;
    }
  ) =>
    providerRequest<FulfillmentCommandResult>(`/bookings/${bookingId}/return`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  complete: (
    bookingId: string,
    data: {
      completedAt: string;
      note?: string;
    }
  ) =>
    providerRequest<FulfillmentCommandResult>(`/bookings/${bookingId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reportIssue: (
    bookingId: string,
    data: {
      reasonCode: string;
      description: string;
      evidenceRefs?: string[];
    }
  ) =>
    providerRequest<FulfillmentCommandResult>(`/bookings/${bookingId}/report-issue`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── Fulfillment Queue ────────────────────────────────────────────────────────

export const fulfillmentApi = {
  getQueue: () => providerRequest<Record<string, unknown>[]>('/fulfillment'),
};

// ─── Acquiring ────────────────────────────────────────────────────────────────

export const acquiringApi = {
  list: () => providerRequest<AcquiringConnection[]>('/acquiring-connections'),

  create: (acquiringProvider: string) =>
    providerRequest<AcquiringConnection>('/acquiring-connections', {
      method: 'POST',
      body: JSON.stringify({ acquiringProvider }),
    }),

  get: (connectionId: string) =>
    providerRequest<AcquiringConnection>(`/acquiring-connections/${connectionId}`),

  getRoutability: (connectionId: string) =>
    providerRequest<Record<string, unknown>>(`/acquiring-connections/${connectionId}/routability`),

  getRecipientRoutes: (connectionId: string) =>
    providerRequest<Record<string, unknown>[]>(
      `/acquiring-connections/${connectionId}/recipient-routes`
    ),

  getDealBinding: (connectionId: string) =>
    providerRequest<Record<string, unknown>>(
      `/acquiring-connections/${connectionId}/deal-binding`
    ),

  submitOnboarding: (connectionId: string, data: AcquiringOnboardingPayload) =>
    providerRequest<AcquiringConnection>(
      `/acquiring-connections/${connectionId}/submit-onboarding`,
      { method: 'POST', body: JSON.stringify(data) }
    ),
};

export type {
  Provider,
  ResourceStatus,
  OfferStatus,
};
