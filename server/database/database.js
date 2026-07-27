/**
 * Точка входа к данным: только PostgreSQL через Prisma.
 */
import { getPrisma, closePrisma } from './prismaClient.js';

/** Кэш наличия таблиц недвижимости (заполняется при initDatabase). */
export const schemaCache = {
  properties: false,
  properties_apartments: false,
  properties_houses: false,
};

export async function initDatabase() {
  const url = process.env.DATABASE_URL || '';
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    throw new Error(
      'Требуется DATABASE_URL с PostgreSQL (postgres:// или postgresql://).'
    );
  }
  const prisma = getPrisma();
  await prisma.$connect();
  const rows = await prisma.$queryRaw`
    SELECT tablename::text AS tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('properties', 'properties_apartments', 'properties_houses')
  `;
  const names = new Set(rows.map((r) => r.tablename));
  schemaCache.properties = names.has('properties');
  schemaCache.properties_apartments = names.has('properties_apartments');
  schemaCache.properties_houses = names.has('properties_houses');
  console.log('✅ PostgreSQL: подключение OK, таблицы недвижимости:', { ...schemaCache });
}

export async function closeDatabase() {
  await closePrisma();
}

export { userQueries, documentQueries, notificationQueries, favoriteQueries } from './module1Prisma.js';
export {
  apartmentQueries,
  houseQueries,
  propertyQueries,
  passesApprovedFilters,
  passesAuctionFilters,
} from './module2PropertyPrisma.js';
export { sharePurchaseQueries } from './moduleSharePurchasePrisma.js';
export { reservationSignatureQueries } from './moduleReservationSignaturePrisma.js';
export { purchaseRequestQueries, testDriveBookingQueries } from './module3Prisma.js';
export { auctionReminderQueries } from './module4AuctionReminderPrisma.js';
export { debtReasonQueries, debtDocumentQueries } from './module5DebtPrisma.js';
export {
  whatsappUserQueries,
  assistantLeadQueries,
  liveChatQueries,
} from './module6ChatPrisma.js';
export { administratorQueries } from './module7AdminPrisma.js';
export { stripeSubscriptionQueries } from './module8StripePrisma.js';
export { crmQueries } from './module9CrmPrisma.js';
export {
  appendPropertyAiMessage,
  createPropertyAiReport,
  ensurePropertyAiConversation,
  findReusablePropertyAiReport,
  getOwnedPropertyAiReport,
  listPropertyAiHistory,
  updatePropertyAiReport,
  userExistsForPropertyAi,
} from './propertyAiReportsPrisma.js';
