export type UserRole = 'provider_manager' | 'rental_staff' | 'partner_ops' | string;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  roles: string[];
  emailVerified?: boolean;
}

export interface ProviderMembership {
  providerId: string;
  displayName: string;
  role: string;
  operatingState: string;
}

// ─── Provider / Profile ──────────────────────────────────────────────────────

export interface OperatingState {
  overallStatus: string;
  onboardingStatus: string;
  lifecycleState?: string;
  moderationStatus?: string;
  capabilityStatus: string;
  settlementStatus: string;
  resourceReadiness: string;
  commercialReadiness: string;
  diagnostics: Record<string, unknown>;
}

export interface Provider {
  providerId: string;
  displayName: string;
  legalName?: string;
  contactEmail: string;
  contactPhone?: string;
  city?: string;
  addressLine?: string;
  description?: string;
  operatingState: OperatingState;
  onboardingStatus?: string;
  lifecycleState?: string;
  moderationStatus?: string;
  updatedAt: string;
}

export interface DashboardCounts {
  totalResources: number;
  activeResources: number;
  totalOffers: number;
  activeOffers: number;
  draftOffers: number;
  totalBookings: number;
  upcomingBookings: number;
  activeAcquiringConnections: number;
}

export interface DashboardWorkQueue {
  bookingsNeedingAction: number;
  pendingHandovers: number;
  pendingReturns: number;
  pendingCompletions: number;
  openFulfillmentIssues: number;
  openSupportIncidents: number;
}

export interface DashboardAlert {
  key: string;
  severity: 'info' | 'warning' | 'error';
  status: 'open' | 'resolved';
  title: string;
  actionCode?: string;
  hint?: string;
}

export interface DashboardResponse {
  providerId: string;
  displayName: string;
  operatingState: OperatingState;
  counts: DashboardCounts;
  workQueue: DashboardWorkQueue;
  alerts: DashboardAlert[];
  updatedAt: string;
}

export interface OnboardingChecklistItem {
  key: string;
  status: string;
  label: string;
  details?: string;
}

export interface OnboardingResponse {
  providerId: string;
  status: string;
  lifecycleState: string;
  moderationStatus: string;
  checklist: OnboardingChecklistItem[];
  nextActions: string[];
  updatedAt: string;
}

// ─── Legacy shape kept for mock data / existing UI components ─────────────────

export interface DashboardStats {
  activeBookings: number;
  pendingHandovers: number;
  pendingReturns: number;
  totalRevenueMTD: number;
  currency: string;
  catalogReadiness: number;
  openIssues: number;
}

// ─── Resources ───────────────────────────────────────────────────────────────

export type ResourceStatus = 'active' | 'inactive' | 'archived' | 'draft';

export interface ResourceReadiness {
  capabilityValid: boolean;
  availabilityReady: boolean;
  pricingReady: boolean;
  policyReady: boolean;
  variantReady: boolean;
  offerAuthoringReady: boolean;
  errors: string[];
}

export interface PublishabilityImpact {
  publishable: boolean;
  reasonCodes: string[];
}

export interface Resource {
  resourceId: string;
  resourceType: string;
  capacityMode?: string;
  status: ResourceStatus;
  title: string;
  readiness: ResourceReadiness;
  publishabilityImpact: PublishabilityImpact;
  updatedAt: string;
  providerId?: string;
  createdAt?: string;
  /** kept for backward-compat with existing UI components */
  id: string;
  slug?: string;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  imageUrl?: string;
  variantCount?: number;
}

// ─── Availability ─────────────────────────────────────────────────────────────

export interface AvailabilityProfile {
  profileId: string;
  resourceId: string;
  availabilityMode: string;
  timezone: string;
  bookingHorizonDays: number;
  status: string;
  readiness?: Record<string, unknown>;
  publishabilityImpact?: Record<string, unknown>;
  updatedAt: string;
  /** kept for backward-compat with existing UI */
  id: string;
  resourceTitle?: string;
  minAdvanceBookingHours?: number;
  maxAdvanceBookingDays?: number;
  defaultCapacity?: number;
}

export interface RecurringRule {
  dayOfWeek: string;
  startsAtLocal: string;
  endsAtLocal: string;
  capacity: number;
}

export interface BlockedPeriod {
  startsAt: string;
  endsAt: string;
  reasonCode: string;
}

export interface AvailabilityCalendar {
  timezone: string;
  recurringRules: RecurringRule[];
  blockedPeriods: BlockedPeriod[];
  exceptions: unknown[];
  updatedAt: string;
}

export interface CapacitySlot {
  slotId: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  totalCapacity: number;
  reservedCapacity: number;
  availableCapacity: number;
  status: string;
  bookingSubjectRef?: {
    resourceId: string;
    resourceType: string;
    bookingSubjectStatus: string;
  };
  updatedAt: string;
}

export interface AvailabilityDiagnostics {
  availabilityReady: boolean;
  bookingRoutable: boolean;
  modeValid: boolean;
  errors: string[];
  warnings: string[];
  publishabilityImpact: PublishabilityImpact;
  checkedAt: string;
}

// ─── Variants ─────────────────────────────────────────────────────────────────

export interface NormalizedAttribute {
  key: string;
  value: string;
}

export interface ResourceVariant {
  variantId: string;
  resourceId: string;
  variantKey: string;
  label: string;
  status: 'active' | 'inactive' | 'archived';
  normalizedAttributes: NormalizedAttribute[];
  sortOrder: number;
  updatedAt: string;
  /** kept for backward-compat with existing UI */
  id: string;
  title: string;
  sku?: string;
  attributes?: Record<string, string>;
  stock?: number;
  createdAt?: string;
}

export interface VariantAllocation {
  allocationMode: string;
  baseQuantity: number;
  allocationRules: {
    sharedPoolCode?: string;
    maxPerBooking?: number;
    maxConcurrent?: number;
  };
  status: string;
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

export interface UnitRules {
  baseAmount: number;
  unit: string;
  minimumUnits: number;
  maximumUnits: number;
}

export interface AdjustmentRule {
  code: string;
  type: 'percent' | 'fixed';
  percent?: number;
  amount?: number;
  appliesWhen: string;
  isRequired: boolean;
}

export interface PricingPolicy {
  pricingMode: string;
  currency: string;
  unitRules: UnitRules;
  adjustmentRules: AdjustmentRule[];
  status: string;
  readiness?: Record<string, unknown>;
  publishabilityImpact?: PublishabilityImpact;
  /** kept for backward-compat with existing UI */
  id: string;
  resourceId?: string;
  offerId?: string;
  label: string;
  basePrice: number;
  adjustments: PricingAdjustment[];
  updatedAt: string;
}

export interface PricingAdjustment {
  id: string;
  type: 'percentage' | 'fixed';
  amount: number;
  condition: string;
  label: string;
}

export interface PricingQuotePreview {
  baseAmount: number;
  adjustments: unknown[];
  subtotal: number;
  taxes: number;
  fees: number;
  totalPrice: number;
  depositAmount: number;
  totalHoldAmount: number;
  currency: string;
}

export interface PricingDiagnostics {
  pricingReady: boolean;
  quoteable: boolean;
  summaryReady: boolean;
  errors: string[];
  warnings: string[];
  publishabilityImpact: PublishabilityImpact;
}

// ─── Policy ───────────────────────────────────────────────────────────────────

export interface PolicyRuleset {
  cancellationWindowHours?: number;
  isCancellationAllowed?: boolean;
  depositPercent?: number;
  [key: string]: unknown;
}

export interface ProviderPolicy {
  ownerType?: string;
  ownerId?: string;
  policyScope: string;
  ruleset: PolicyRuleset;
  status: string;
  readiness?: Record<string, unknown>;
  publishabilityImpact?: PublishabilityImpact;
  /** kept for backward-compat with existing UI */
  id: string;
  resourceId?: string;
  label: string;
  cancellationWindowHours: number;
  cancellationRefundPercent: number;
  depositRequired: boolean;
  depositPercent: number;
  lateReturnFeeEnabled: boolean;
  damageDepositRequired: boolean;
  additionalNotes?: string;
  updatedAt: string;
}

export interface PolicyDiagnostics {
  validationReady: boolean;
  summaryReady: boolean;
  errors: string[];
  warnings: string[];
  publishabilityImpact: PublishabilityImpact;
}

// ─── Offers ───────────────────────────────────────────────────────────────────

export type OfferStatus = 'draft' | 'active' | 'inactive' | 'archived';

export interface LocationRef {
  city: string;
  countryCode: string;
}

export interface IncludedItem {
  label: string;
}

export interface MediaRefs {
  coverUrl?: string;
  gallery?: string[];
}

export interface OfferPublishability {
  status: 'publishable' | 'not_publishable';
  reason: string;
}

export interface Offer {
  offerId: string;
  offerType: string;
  status: OfferStatus;
  primaryResourceId: string;
  bookingFlowType: string;
  title: string;
  subtitle?: string;
  description?: string;
  locationRef?: LocationRef;
  includedItems?: IncludedItem[];
  requiredItems?: IncludedItem[];
  mediaRefs?: MediaRefs;
  pricingSummary?: Record<string, unknown>;
  policySummary?: Record<string, unknown>;
  canonicalOfferId?: string;
  publishability: OfferPublishability;
  executionLink?: Record<string, unknown>;
  updatedAt: string;
  createdAt?: string;
  /** kept for backward-compat with existing UI */
  id: string;
  slug?: string;
  resourceId?: string;
  resourceTitle?: string;
  basePrice?: number;
  currency?: string;
  durationUnit?: 'hour' | 'day' | 'week';
  durationValue?: number;
  isPublishable?: boolean;
  publishabilityIssues?: string[];
}

export interface OfferVariantExposure {
  isRequiredForBooking: boolean;
  displayLabelOverride?: string;
  visibilityStatus: string;
  sortOrder: number;
}

export interface OfferRoutability {
  publishable: boolean;
  offerStatus: string;
  status: string;
  routable: boolean;
  resolutionReady: boolean;
  availabilityReady: boolean;
  pricingReady: boolean;
  policyReady: boolean;
  capabilityValid: boolean;
  variantReady: boolean;
  reasonCodes: string[];
  warnings: string[];
  issues: string[];
  checkedAt: string;
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show'
  | 'pending_fulfillment';

export interface CustomerSummary {
  fullName: string;
  [key: string]: unknown;
}

export interface BookingListItem {
  bookingId: string;
  bookingNumber: string;
  offerId: string;
  offerTitle: string;
  bookingType: string;
  customerSummary: CustomerSummary;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  quantity: number;
  fulfillmentSummary?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BookingDetail {
  bookingId: string;
  bookingNumber: string;
  status: BookingStatus;
  statusReason?: string;
  offer?: Record<string, unknown>;
  customerSummary: CustomerSummary;
  schedule?: Record<string, unknown>;
  selectionSummary?: Record<string, unknown>;
  assuranceSummary?: Record<string, unknown>;
  fulfillment?: {
    status: string;
    completionAllowed: boolean;
    issueReportingAllowed: boolean;
  };
  providerPolicySummary?: Record<string, unknown>;
  support?: { correlationRef: string };
}

/** Legacy shape kept for existing UI components that use the old Booking interface */
export interface Booking {
  id: string;
  ref: string;
  status: BookingStatus;
  customer: BookingCustomer;
  selection: BookingSelection;
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface BookingCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface BookingSelection {
  offerId: string;
  offerTitle: string;
  resourceId: string;
  resourceTitle: string;
  variantId?: string;
  variantTitle?: string;
  quantity: number;
  startDate: string;
  endDate?: string;
  durationLabel: string;
}

// ─── Fulfillment ──────────────────────────────────────────────────────────────

export type FulfillmentStatus =
  | 'pending_handover'
  | 'active'
  | 'pending_return'
  | 'completed'
  | 'issue_reported';

export interface FulfillmentItem {
  bookingId: string;
  bookingRef: string;
  status: FulfillmentStatus;
  customer: BookingCustomer;
  selection: BookingSelection;
  handoverAt?: string;
  returnAt?: string;
  completedAt?: string;
  issueReportedAt?: string;
  notes?: string;
}

export interface FulfillmentCommandResult {
  booking: {
    bookingId: string;
    bookingNumber: string;
    fulfillmentStage: string;
    support?: { correlationRef: string };
  };
  result: {
    status: 'accepted' | 'rejected';
    reasonCode: string | null;
  };
}

// ─── Acquiring ────────────────────────────────────────────────────────────────

export interface AcquiringConnection {
  connectionId: string;
  acquiringProvider: string;
  status: string;
  shopCode?: string;
  onboardingStatus: string;
  paymentRouteable: boolean;
  updatedAt: string;
}

export interface AcquiringOnboardingPayload {
  legalProfile: {
    legalEntityName: string;
    taxpayerNumber: string;
    registrationNumber: string;
    registeredAddress: string;
  };
  contactProfile: {
    fullName: string;
    email: string;
    phone: string;
    position: string;
  };
  settlementProfile: {
    bankName: string;
    bankAccount: string;
    correspondentAccount: string;
    bik: string;
    beneficiaryName: string;
  };
}
