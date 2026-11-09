import { config } from 'dotenv'
import { getPrisma, closePrisma } from '../server/database/prismaClient.js'

config({ quiet: true })
config({ path: '.env.local', quiet: true })
const prisma = getPrisma()
const slug = 'demo-vip-covered-auction-villa'

try {
  const existing = await prisma.properties_houses.findFirst({ where: { slug }, select: { id: true } })
  if (existing) {
    await prisma.properties_houses.update({ where: { id: existing.id }, data: { sale_type: 'auction', photos: JSON.stringify(['/images/auction/vip-covered-card.webp']) } })
    console.log(`VIP demo auction already exists: houses:${existing.id}`)
  } else {
    const email = 'vip-auction-demo@sellyourbrick.test'
    const seller = await prisma.users.findFirst({ where: { email, role: 'seller' }, select: { id: true } }) ||
      await prisma.users.create({ data: { first_name: 'VIP Demo', email, role: 'seller' }, select: { id: true } })
    const now = new Date()
    const lot = await prisma.properties_houses.create({ data: {
      user_id: seller.id, slug, property_type: 'villa',
      title: 'VIP Auction Demo',
      description: 'Demonstration listing for the VIP auction preview. Not an offer for a real property.',
      is_auction: 1, sale_type: 'auction', private_club_only: 1, moderation_status: 'approved',
      reviewed_by: 'vip-auction-demo-seed', reviewed_at: now.toISOString(),
      auction_start_date: now.toISOString(),
      auction_end_date: new Date(now.getTime() + 30 * 86400000).toISOString(),
      price: 850000, currency: 'EUR', auction_starting_price: 650000,
      area: 240, bedrooms: 4, bathrooms: 3, floors: 2,
      country: 'Spain', city: 'Marbella', location: 'Marbella, Spain',
      photos: JSON.stringify(['/images/auction/vip-covered-card.webp']),
      created_at: now.toISOString(), updated_at: now.toISOString(),
    }, select: { id: true } })
    console.log(`Created VIP demo auction: houses:${lot.id}`)
  }
} finally {
  await closePrisma()
}
