import { publicAsset } from '../utils/publicAsset'

/** Изображения для страницы «Подписки» (owner-subscriptions-test) */
export const OST_IMAGES = {
  promoSidebarBuyer: publicAsset('images/owner-properties-test/owner-promo-sidebar-buyer.png'),
  planStandard: publicAsset('images/owner-subscriptions-test/plan-tier-standard.png'),
  planPro: publicAsset('images/owner-subscriptions-test/plan-tier-pro.png'),
  planInstitutional: publicAsset('images/owner-subscriptions-test/plan-tier-institutional.png'),
  yearlySaveHero: publicAsset('images/owner-subscriptions-test/ost-yearly-save-hero.png'),
}

export const OST_PLAN_ART = {
  standard: OST_IMAGES.planStandard,
  pro: OST_IMAGES.planPro,
  institutional: OST_IMAGES.planInstitutional,
}
