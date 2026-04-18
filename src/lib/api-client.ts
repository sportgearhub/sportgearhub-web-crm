import type {
  Booking,
  BookingStatus,
  FulfillmentItem,
  Provider,
} from '../types';

const BASE_URL = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
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

export const authApi = {
  me: () => request<{ user: { id: string; email: string; name: string } }>('/auth/me'),
  signout: () => request<void>('/auth/signout', { method: 'POST' }),
  googleStart: () => `${BASE_URL}/auth/oauth/google/start`,
  yandexStart: () => `${BASE_URL}/auth/oauth/yandex/start`,
};

export const providerApi = {
  getBookings: (params: {
    status?: BookingStatus;
    from?: string;
    to?: string;
    offerId?: string;
    resourceId?: string;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)));
    return request<{ items: Booking[]; total: number; page: number; limit: number }>(
      `/v1/provider/bookings?${qs}`
    );
  },

  getBooking: (bookingId: string) =>
    request<Booking>(`/v1/provider/bookings/${bookingId}`),

  getFulfillmentQueue: () =>
    request<{ items: FulfillmentItem[] }>('/v1/provider/fulfillment'),

  getFulfillmentItem: (bookingId: string) =>
    request<FulfillmentItem>(`/v1/provider/fulfillment/${bookingId}`),

  handover: (bookingId: string, data: { notes?: string; handoverAt: string }) =>
    request<FulfillmentItem>(`/v1/provider/fulfillment/${bookingId}/handover`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  return: (bookingId: string, data: { notes?: string; returnAt: string; condition?: string }) =>
    request<FulfillmentItem>(`/v1/provider/fulfillment/${bookingId}/return`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  complete: (bookingId: string, data: { notes?: string }) =>
    request<FulfillmentItem>(`/v1/provider/fulfillment/${bookingId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  issueReport: (bookingId: string, data: { description: string; severity: string; reportedAt: string }) =>
    request<FulfillmentItem>(`/v1/provider/fulfillment/${bookingId}/issue-report`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export type { Provider };
