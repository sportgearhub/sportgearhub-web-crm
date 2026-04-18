import type {
  Provider,
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

const BASE_URL = '/v1/provider';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Profile & Dashboard ──────────────────────────────────────────────────────

export const dashboardApi = {
  get: () => request<DashboardResponse>('/dashboard'),
};

export const profileApi = {
  get: () => request<Provider>('/profile'),

  patch: (data: {
    displayName?: string;
    legalName?: string;
    contactEmail?: string;
    contactPhone?: string;
    city?: string;
    addressLine?: string;
    description?: string;
  }) => request<Provider>('/profile', { method: 'PATCH', body: JSON.stringify(data) }),

  getOperatingState: () => request<Provider['operatingState']>('/operating-state'),

  getOnboarding: () => request<OnboardingResponse>('/onboarding'),

  submitOnboarding: (note: string) =>
    request<OnboardingResponse>('/onboarding/submit', {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
};

// ─── Resources ────────────────────────────────────────────────────────────────

export const resourcesApi = {
  list: () => request<Resource[]>('/resources'),

  create: (data: {
    resourceType: string;
    capacityMode: string;
    title: string;
    baseCapacity: number;
  }) => request<Resource>('/resources', { method: 'POST', body: JSON.stringify(data) }),

  get: (resourceId: string) => request<Resource>(`/resources/${resourceId}`),

  patch: (
    resourceId: string,
    data: { status?: ResourceStatus; title?: string; baseCapacity?: number }
  ) =>
    request<Resource>(`/resources/${resourceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  archive: (resourceId: string, reasonCode: string) =>
    request<Resource>(`/resources/${resourceId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ reasonCode }),
    }),

  getRoutabilityImpact: (resourceId: string) =>
    request<{
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
    request<AvailabilityProfile>(`/resources/${resourceId}/availability-profile`),

  putProfile: (
    resourceId: string,
    data: {
      availabilityMode: string;
      timezone: string;
      bookingHorizonDays: number;
      status: string;
    }
  ) =>
    request<AvailabilityProfile>(`/resources/${resourceId}/availability-profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getCalendar: (resourceId: string) =>
    request<AvailabilityCalendar>(`/resources/${resourceId}/availability-calendar`),

  putCalendar: (
    resourceId: string,
    data: {
      timezone: string;
      recurringRules: AvailabilityCalendar['recurringRules'];
      blockedPeriods: AvailabilityCalendar['blockedPeriods'];
      exceptions: unknown[];
    }
  ) =>
    request<AvailabilityCalendar>(`/resources/${resourceId}/availability-calendar`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  listSlots: (
    resourceId: string,
    params: { dateFrom?: string; dateTo?: string; status?: string }
  ) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, v));
    return request<CapacitySlot[]>(`/resources/${resourceId}/capacity-slots?${qs}`);
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
    request<CapacitySlot>(`/resources/${resourceId}/capacity-slots`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  patchSlot: (resourceId: string, slotId: string, data: Partial<CapacitySlot>) =>
    request<CapacitySlot>(`/resources/${resourceId}/capacity-slots/${slotId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  closeSlot: (resourceId: string, slotId: string) =>
    request<CapacitySlot>(`/resources/${resourceId}/capacity-slots/${slotId}/close`, {
      method: 'POST',
    }),

  getDiagnostics: (resourceId: string) =>
    request<AvailabilityDiagnostics>(`/resources/${resourceId}/availability-diagnostics`),
};

// ─── Variants ─────────────────────────────────────────────────────────────────

export const variantsApi = {
  list: (resourceId: string) =>
    request<ResourceVariant[]>(`/resources/${resourceId}/variants`),

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
    request<ResourceVariant>(`/resources/${resourceId}/variants`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (resourceId: string, variantId: string) =>
    request<ResourceVariant>(`/resources/${resourceId}/variants/${variantId}`),

  patch: (
    resourceId: string,
    variantId: string,
    data: Partial<Pick<ResourceVariant, 'label' | 'variantKey' | 'variantType' | 'normalizedAttributes' | 'sortOrder' | 'status'>>
  ) =>
    request<ResourceVariant>(`/resources/${resourceId}/variants/${variantId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  archive: (resourceId: string, variantId: string) =>
    request<ResourceVariant>(`/resources/${resourceId}/variants/${variantId}/archive`, {
      method: 'POST',
    }),

  getAllocation: (resourceId: string, variantId: string) =>
    request<VariantAllocation>(`/resources/${resourceId}/variants/${variantId}/allocation`),

  putAllocation: (resourceId: string, variantId: string, data: VariantAllocation) =>
    request<VariantAllocation>(`/resources/${resourceId}/variants/${variantId}/allocation`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getDiagnostics: (resourceId: string, variantId: string) =>
    request<Record<string, unknown>>(
      `/resources/${resourceId}/variants/${variantId}/diagnostics`
    ),
};

// ─── Pricing ──────────────────────────────────────────────────────────────────

export const pricingApi = {
  getResourcePolicy: (resourceId: string) =>
    request<PricingPolicy>(`/resources/${resourceId}/pricing-policy`),

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
    request<PricingPolicy>(`/resources/${resourceId}/pricing-policy`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getResourceDiagnostics: (resourceId: string) =>
    request<PricingDiagnostics>(`/resources/${resourceId}/pricing-diagnostics`),

  quotePreview: (data: {
    offerId?: string;
    resourceId?: string | null;
    selectionContext: {
      startAt: string;
      endAt: string;
      quantity: number;
    };
  }) =>
    request<PricingQuotePreview>('/pricing/quote-preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOfferPolicy: (offerId: string) =>
    request<PricingPolicy>(`/offers/${offerId}/pricing-policy`),

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
    request<PricingPolicy>(`/offers/${offerId}/pricing-policy`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  offerPricingSummaryPreview: (offerId: string) =>
    request<Record<string, unknown>>(`/offers/${offerId}/pricing-summary-preview`, {
      method: 'POST',
    }),
};

// ─── Policy ───────────────────────────────────────────────────────────────────

export const policyApi = {
  getProfile: () => request<ProviderPolicy>('/policy-profile'),

  putProfile: (data: {
    policyScope: string;
    ruleset: ProviderPolicy['ruleset'];
    status: string;
  }) =>
    request<ProviderPolicy>('/policy-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getResourcePolicy: (resourceId: string) =>
    request<ProviderPolicy>(`/resources/${resourceId}/policy`),

  putResourcePolicy: (
    resourceId: string,
    data: {
      overrideScope: string;
      overrideRules: ProviderPolicy['ruleset'];
      status: string;
    }
  ) =>
    request<ProviderPolicy>(`/resources/${resourceId}/policy`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  offerPolicySummaryPreview: (offerId: string) =>
    request<Record<string, unknown>>(`/offers/${offerId}/policy-summary-preview`, {
      method: 'POST',
    }),

  getResourceDiagnostics: (resourceId: string) =>
    request<PolicyDiagnostics>(`/resources/${resourceId}/policy-diagnostics`),

  getOfferPolicy: (offerId: string) =>
    request<ProviderPolicy>(`/offers/${offerId}/policy`),

  putOfferPolicy: (
    offerId: string,
    data: {
      overrideScope: string;
      overrideRules: ProviderPolicy['ruleset'];
      status: string;
    }
  ) =>
    request<ProviderPolicy>(`/offers/${offerId}/policy`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ─── Offers ───────────────────────────────────────────────────────────────────

export const offersApi = {
  list: () => request<Offer[]>('/offers'),

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
  }) => request<Offer>('/offers', { method: 'POST', body: JSON.stringify(data) }),

  get: (offerId: string) => request<Offer>(`/offers/${offerId}`),

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
  ) => request<Offer>(`/offers/${offerId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  checkPublishability: (offerId: string) =>
    request<OfferPublishability>(`/offers/${offerId}/check-publishability`, {
      method: 'POST',
    }),

  activate: (offerId: string) =>
    request<Offer>(`/offers/${offerId}/activate`, { method: 'POST' }),

  deactivate: (offerId: string) =>
    request<Offer>(`/offers/${offerId}/deactivate`, { method: 'POST' }),

  archive: (offerId: string, reasonCode: string) =>
    request<Offer>(`/offers/${offerId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ reasonCode }),
    }),

  getVariantExposure: (offerId: string) =>
    request<OfferVariantExposure>(`/offers/${offerId}/variant-exposure`),

  putVariantExposure: (offerId: string, data: OfferVariantExposure) =>
    request<OfferVariantExposure>(`/offers/${offerId}/variant-exposure`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getRoutability: (offerId: string) =>
    request<OfferRoutability>(`/offers/${offerId}/routability`),

  listRoutability: () => request<OfferRoutability[]>('/offers/routability'),
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
    return request<BookingListItem[]>(`/bookings?${qs}`);
  },

  get: (bookingId: string) => request<BookingDetail>(`/bookings/${bookingId}`),

  getFulfillment: (bookingId: string) =>
    request<Record<string, unknown>>(`/bookings/${bookingId}/fulfillment`),

  handover: (
    bookingId: string,
    data: {
      handedOverAt: string;
      note?: string;
      handoverMetadata?: { key: string; value: string }[];
    }
  ) =>
    request<FulfillmentCommandResult>(`/bookings/${bookingId}/handover`, {
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
    request<FulfillmentCommandResult>(`/bookings/${bookingId}/return`, {
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
    request<FulfillmentCommandResult>(`/bookings/${bookingId}/complete`, {
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
    request<FulfillmentCommandResult>(`/bookings/${bookingId}/report-issue`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── Fulfillment Queue ────────────────────────────────────────────────────────

export const fulfillmentApi = {
  getQueue: () => request<Record<string, unknown>[]>('/fulfillment'),
};

// ─── Acquiring ────────────────────────────────────────────────────────────────

export const acquiringApi = {
  list: () => request<AcquiringConnection[]>('/acquiring-connections'),

  create: (acquiringProvider: string) =>
    request<AcquiringConnection>('/acquiring-connections', {
      method: 'POST',
      body: JSON.stringify({ acquiringProvider }),
    }),

  get: (connectionId: string) =>
    request<AcquiringConnection>(`/acquiring-connections/${connectionId}`),

  getRoutability: (connectionId: string) =>
    request<Record<string, unknown>>(`/acquiring-connections/${connectionId}/routability`),

  getRecipientRoutes: (connectionId: string) =>
    request<Record<string, unknown>[]>(
      `/acquiring-connections/${connectionId}/recipient-routes`
    ),

  getDealBinding: (connectionId: string) =>
    request<Record<string, unknown>>(
      `/acquiring-connections/${connectionId}/deal-binding`
    ),

  submitOnboarding: (connectionId: string, data: AcquiringOnboardingPayload) =>
    request<AcquiringConnection>(
      `/acquiring-connections/${connectionId}/submit-onboarding`,
      { method: 'POST', body: JSON.stringify(data) }
    ),
};

export type {
  Provider,
  ResourceStatus,
  OfferStatus,
};