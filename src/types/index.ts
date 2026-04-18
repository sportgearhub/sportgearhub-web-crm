export type UserRole = 'provider_manager' | 'rental_staff' | 'partner_ops';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  providerId: string;
  providerName: string;
}

export interface Provider {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending';
  contactEmail: string;
  contactPhone?: string;
  timezone: string;
  currency: string;
  createdAt: string;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

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

export type ResourceStatus = 'active' | 'inactive' | 'archived' | 'draft';

export interface Resource {
  id: string;
  title: string;
  slug: string;
  status: ResourceStatus;
  categoryId: string;
  categoryName: string;
  description?: string;
  imageUrl?: string;
  variantCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceVariant {
  id: string;
  resourceId: string;
  title: string;
  sku?: string;
  status: 'active' | 'inactive';
  attributes: Record<string, string>;
  sortOrder: number;
  stock?: number;
  createdAt: string;
}

export type OfferStatus = 'draft' | 'active' | 'inactive' | 'archived';

export interface Offer {
  id: string;
  title: string;
  slug: string;
  status: OfferStatus;
  resourceId: string;
  resourceTitle: string;
  description?: string;
  basePrice: number;
  currency: string;
  durationUnit: 'hour' | 'day' | 'week';
  durationValue: number;
  isPublishable: boolean;
  publishabilityIssues: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityProfile {
  id: string;
  resourceId: string;
  resourceTitle: string;
  bookingHorizonDays: number;
  minAdvanceBookingHours: number;
  maxAdvanceBookingDays: number;
  defaultCapacity: number;
  timezone: string;
  updatedAt: string;
}

export interface PricingPolicy {
  id: string;
  resourceId?: string;
  offerId?: string;
  label: string;
  basePrice: number;
  currency: string;
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

export interface ProviderPolicy {
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

export interface DashboardStats {
  activeBookings: number;
  pendingHandovers: number;
  pendingReturns: number;
  totalRevenueMTD: number;
  currency: string;
  catalogReadiness: number;
  openIssues: number;
}
