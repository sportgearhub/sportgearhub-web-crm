import { ApiError, offersApi } from '../../lib/api-client';
import type { Offer } from '../../types';

export async function attachOfferReadiness(offer: Offer): Promise<Offer> {
  try {
    return { ...offer, readiness: await offersApi.getReadiness(offer.offerId) };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return offer;
    return offer;
  }
}

export function attachOffersReadiness(offers: Offer[]) {
  return offersApi.listReadiness()
    .then(readinessList => {
      const readinessByOfferId = new Map(readinessList.map(readiness => [readiness.offerId, readiness]));
      return offers.map(offer => ({ ...offer, readiness: readinessByOfferId.get(offer.offerId) ?? offer.readiness }));
    })
    .catch(() => Promise.all(offers.map(attachOfferReadiness)));
}

export function offerCustomerVisible(offer: Offer) {
  return offer.readiness?.customerVisibleNow ?? offer.isPublishable ?? false;
}

export function offerBookingSetupReady(offer: Offer) {
  return offer.readiness?.bookingSetupReady ?? offer.isPublishable ?? false;
}
