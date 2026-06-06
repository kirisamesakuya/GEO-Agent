export const BRANDS_UPDATED_EVENT = 'geo:brands-updated';

export function notifyBrandsUpdated() {
  window.dispatchEvent(new Event(BRANDS_UPDATED_EVENT));
}
