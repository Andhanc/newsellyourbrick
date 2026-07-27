import 'dotenv/config'
import { getPrisma } from '../server/database/prismaClient.js'

const prisma = getPrisma()
const PUBLIC_USER_ID = '12627'
const START_DATE = '2026-08-14'
const END_DATE = '2026-08-20'
const OBSOLETE_DEMO_BOOKING_ID = 15

function hasPhoto(value) {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) && parsed.length > 0
  } catch {
    return false
  }
}

function hasCommercialTitle(property) {
  const title = String(property?.title || '').trim()
  return title.length >= 8 && !/(^|\s)(test|demo|тест|пример)(\s|$)/i.test(title)
}

async function findRealTestDriveProperty() {
  const select = {
    id: true,
    title: true,
    property_type: true,
    location: true,
    photos: true,
    test_drive: true,
    moderation_status: true,
    user_id: true,
  }
  const where = { moderation_status: 'approved' }
  const [houses, apartments] = await Promise.all([
    prisma.properties_houses.findMany({ where, select, orderBy: { id: 'asc' }, take: 100 }),
    prisma.properties_apartments.findMany({ where, select, orderBy: { id: 'asc' }, take: 100 }),
  ])
  const viableHouses = houses.filter((property) => hasPhoto(property.photos) && hasCommercialTitle(property))
  const viableApartments = apartments.filter(
    (property) => hasPhoto(property.photos) && hasCommercialTitle(property),
  )
  const house =
    viableHouses.find((property) => Number(property.test_drive) === 1) ||
    viableHouses.find((property) => property.id === 39) ||
    viableHouses[0]
  if (house) return { ...house, propertyTable: 'properties_houses' }
  const apartment =
    viableApartments.find((property) => Number(property.test_drive) === 1) || viableApartments[0]
  if (apartment) return { ...apartment, propertyTable: 'properties_apartments' }
  throw new Error('Не найден одобренный реальный объект с коммерческим названием и фотографиями')
}

try {
  const user = await prisma.users.findFirst({
    where: { user_id_number: PUBLIC_USER_ID },
    select: { id: true, user_id_number: true, first_name: true, last_name: true, email: true },
  })
  if (!user) throw new Error(`Покупатель с публичным ID ${PUBLIC_USER_ID} не найден`)

  const property = await findRealTestDriveProperty()
  if (Number(property.user_id) === Number(user.id)) {
    throw new Error('Найденный объект принадлежит самому покупателю; выберите другой объект')
  }

  const obsoleteDemoBooking = await prisma.test_drive_bookings.findUnique({
    where: { id: OBSOLETE_DEMO_BOOKING_ID },
  })
  if (
    obsoleteDemoBooking &&
    obsoleteDemoBooking.user_id === user.id &&
    obsoleteDemoBooking.property_id === 2 &&
    obsoleteDemoBooking.property_table === 'properties_houses' &&
    obsoleteDemoBooking.start_date === START_DATE &&
    obsoleteDemoBooking.end_date === END_DATE
  ) {
    await prisma.test_drive_bookings.delete({ where: { id: OBSOLETE_DEMO_BOOKING_ID } })
  }

  const existing = await prisma.test_drive_bookings.findFirst({
    where: {
      user_id: user.id,
      property_id: property.id,
      property_table: property.propertyTable,
      start_date: START_DATE,
      end_date: END_DATE,
    },
  })

  if (existing) {
    console.log(JSON.stringify({
      result: 'already exists',
      bookingId: existing.id,
      publicUserId: user.user_id_number,
      internalUserId: user.id,
      propertyId: property.id,
      propertyTable: property.propertyTable,
      propertyTitle: property.title,
      location: property.location,
      startDate: existing.start_date,
      endDate: existing.end_date,
      status: existing.status,
    }))
  } else {
    const collision = await prisma.test_drive_bookings.findFirst({
      where: {
        property_id: property.id,
        property_table: property.propertyTable,
        status: { in: ['pending', 'approved', 'paid'] },
        AND: [
          { start_date: { lte: END_DATE } },
          { end_date: { gte: START_DATE } },
        ],
      },
    })
    if (collision) throw new Error(`Даты пересекаются с бронью #${collision.id}`)

    const booking = await prisma.test_drive_bookings.create({
      data: {
        property_id: property.id,
        property_table: property.propertyTable,
        user_id: user.id,
        start_date: START_DATE,
        end_date: END_DATE,
        status: 'approved',
      },
    })

    console.log(JSON.stringify({
      result: 'created',
      bookingId: booking.id,
      publicUserId: user.user_id_number,
      internalUserId: user.id,
      propertyId: property.id,
      propertyTable: property.propertyTable,
      propertyTitle: property.title,
      location: property.location,
      startDate: booking.start_date,
      endDate: booking.end_date,
      status: booking.status,
    }))
  }
} finally {
  await prisma.$disconnect()
}
