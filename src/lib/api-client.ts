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
const PROVIDER_BASE_URL = '/v1/provider';

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
  email: string;
  name?: string;
  surname?: string;
  roles?: string[];
  role?: string;
  emailVerified?: boolean;
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
  const name = user.name && user.surname ? `${user.name} ${user.surname}` : user.name ?? user.email;

  return {
    id: user.userId ?? user.id ?? user.email,
    email: user.email,
    name,
    role: roles[0] ?? 'User',
    roles,
    emailVerified: user.emailVerified,
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
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
  login: async (email: string, password: string) =>
    normalizeUser(await request<ApiUser>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })),
  me: async () => normalizeUser(await request<ApiUser>('/api/v1/auth/me')),
  register: async (data: { name: string; surname: string; email: string; password: string }) =>
    normalizeUser(await request<ApiUser>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })),
  verifyEmail: (token: string) =>
    request<void>('/api/v1/auth/email/verify', {
      method: 'POST',
      credentials: 'omit',
      body: JSON.stringify({ token }),
    }),
  resendVerification: (email: string) =>
    request<void>('/api/v1/auth/email/verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  forgotPassword: (email: string) =>
    request<void>('/api/v1/auth/password/forgot', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, newPassword: string) =>
    request<void>('/api/v1/auth/password/reset', {
      method: 'POST',
      credentials: 'omit',
      body: JSON.stringify({ token, newPassword }),
    }),
  signout: () => request<void>('/api/v1/auth/signout', { method: 'POST' }),
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
  list: () => providerRequest<Resource[]>('/resources'),

  create: (data: {
    resourceType: string;
    capacityMode: string;
    title: string;
    baseCapacity: number;
  }) => providerRequest<Resource>('/resources', { method: 'POST', body: JSON.stringify(data) }),

  get: (resourceId: string) => providerRequest<Resource>(`/resources/${resourceId}`),

  patch: (
    resourceId: string,
    data: { status?: ResourceStatus; title?: string; baseCapacity?: number }
  ) =>
    providerRequest<Resource>(`/resources/${resourceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  archive: (resourceId: string, reasonCode: string) =>
    providerRequest<Resource>(`/resources/${resourceId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ reasonCode }),
    }),

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
