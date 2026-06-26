export const PUBLISHER_NOTIFICATIONS_UPDATED_EVENT = 'geo:publisher-notifications-updated';

export function notifyPublisherNotificationsUpdated() {
  window.dispatchEvent(new Event(PUBLISHER_NOTIFICATIONS_UPDATED_EVENT));
}
