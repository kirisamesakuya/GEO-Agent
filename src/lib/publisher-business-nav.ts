import {
  PUBLISHER_BUSINESS_NAV,
  PUBLISHER_CONTENT_DELIVERY_NAV,
  PUBLISHER_CONTENT_DELIVERY_SECTION_TITLE,
  PUBLISHER_DISPATCH_NAV,
  PUBLISHER_WEBSITE_NAV,
  PUBLISHER_WEBSITE_NAV_SECTION_TITLE,
  isPaidSourceNavHint,
  isPublisherBusinessNavActive,
} from '../../lib/publisher-nav';
import { isContentDeliveryNavActive, type ContentDeliveryTab } from './content-delivery-nav';
import type { ViewType } from '../types';

export function isPaidSourceView(view: ViewType, hint?: string): boolean {
  return (
    (view === 'create_order' ||
      view === 'delivery_plan' ||
      view === 'paid_source_tasks' ||
      view === 'quote_compare') &&
    isPaidSourceNavHint(hint)
  );
}

export function paidSourceHint(hint?: string): string {
  if (hint?.startsWith('plan:') || hint?.startsWith('geo:') || hint?.startsWith('index:')) return hint;
  if (hint?.startsWith('paid_quote')) return hint;
  return 'paid_quote';
}

export function isPublisherContentDeliveryNavActive(
  activeView: ViewType,
  tab: ContentDeliveryTab,
  viewHint?: string
): boolean {
  return isContentDeliveryNavActive(activeView, tab, viewHint);
}

export {
  PUBLISHER_BUSINESS_NAV,
  PUBLISHER_CONTENT_DELIVERY_NAV,
  PUBLISHER_CONTENT_DELIVERY_SECTION_TITLE,
  PUBLISHER_DISPATCH_NAV,
  PUBLISHER_WEBSITE_NAV,
  PUBLISHER_WEBSITE_NAV_SECTION_TITLE,
  isPublisherBusinessNavActive,
};
