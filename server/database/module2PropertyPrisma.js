/**
 * Модуль 2: квартиры, дома, агрегированная недвижимость — PostgreSQL через Prisma.
 */
import { getPrisma } from './prismaClient.js';

function parseJsonSafe(val, fallback) {
  if (val == null || val === '') return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function parseApartmentRow(property) {
  if (!property) return null;
  const p = { ...property };
  if (p.users) delete p.users;
  if (p.property_type !== 'apartment' && p.property_type !== 'commercial') {
    console.error(
      `❌ apartmentQueries.getById: объект ID=${p.id} в properties_apartments с некорректным property_type=${p.property_type}`
    );
    return null;
  }
  p.amenities = parseJsonSafe(p.amenities, []);
  p.coordinates = parseJsonSafe(p.coordinates, null);
  p.photos = parseJsonSafe(p.photos, []);
  p.videos = parseJsonSafe(p.videos, []);
  p.additional_documents = parseJsonSafe(p.additional_documents, []);
  p.test_drive_data = parseJsonSafe(p.test_drive_data, null);
  return p;
}

function parseHouseRow(property) {
  if (!property) return null;
  const p = { ...property };
  if (p.users) delete p.users;
  if (p.property_type !== 'house' && p.property_type !== 'villa') {
    console.error(
      `❌ houseQueries.getById: объект ID=${p.id} в properties_houses с некорректным property_type=${p.property_type}`
    );
    return null;
  }
  p.amenities = parseJsonSafe(p.amenities, []);
  p.coordinates = parseJsonSafe(p.coordinates, null);
  p.photos = parseJsonSafe(p.photos, []);
  p.videos = parseJsonSafe(p.videos, []);
  p.additional_documents = parseJsonSafe(p.additional_documents, []);
  p.test_drive_data = parseJsonSafe(p.test_drive_data, null);
  return p;
}

function mapApartmentWithUser(p) {
  const u = p.users;
  const { users, ...rest } = p;
  return {
    ...rest,
    first_name: u?.first_name ?? null,
    last_name: u?.last_name ?? null,
    email: u?.email ?? null,
    phone_number: u?.phone_number ?? null,
    role: u?.role ?? null,
    source_table: 'apartments',
  };
}

function mapHouseWithUser(p) {
  const u = p.users;
  const { users, ...rest } = p;
  return {
    ...rest,
    first_name: u?.first_name ?? null,
    last_name: u?.last_name ?? null,
    email: u?.email ?? null,
    phone_number: u?.phone_number ?? null,
    role: u?.role ?? null,
    source_table: 'houses',
  };
}

function mapListWithUserParse(rows, kind) {
  return rows.map((row) => {
    const flat = kind === 'apt' ? mapApartmentWithUser(row) : mapHouseWithUser(row);
    return kind === 'apt' ? parseApartmentRow(flat) : parseHouseRow(flat);
  });
}

function buildAmenitiesApartmentCreate(propertyData) {
  const amenities = [];
  if (propertyData.balcony === 1 || propertyData.balcony === true || propertyData.balcony === '1') {
    amenities.push('balcony');
  }
  if (propertyData.parking === 1 || propertyData.parking === true || propertyData.parking === '1') {
    amenities.push('parking');
  }
  if (propertyData.elevator === 1 || propertyData.elevator === true || propertyData.elevator === '1') {
    amenities.push('elevator');
  }
  if (propertyData.electricity === 1 || propertyData.electricity === true || propertyData.electricity === '1') {
    amenities.push('electricity');
  }
  if (propertyData.internet === 1 || propertyData.internet === true || propertyData.internet === '1') {
    amenities.push('internet');
  }
  if (propertyData.security === 1 || propertyData.security === true || propertyData.security === '1') {
    amenities.push('security');
  }
  if (propertyData.furniture === 1 || propertyData.furniture === true || propertyData.furniture === '1') {
    amenities.push('furniture');
  }
  for (let i = 1; i <= 26; i++) {
    const featureKey = `feature${i}`;
    const featureValue = propertyData[featureKey];
    if (featureValue === 1 || featureValue === true || featureValue === '1') {
      amenities.push(featureKey);
    }
  }
  return JSON.stringify(amenities);
}

function buildAmenitiesApartmentUpdate(propertyData) {
  const amenities = [];
  if (propertyData.balcony) amenities.push('balcony');
  if (propertyData.parking) amenities.push('parking');
  if (propertyData.elevator) amenities.push('elevator');
  if (propertyData.electricity) amenities.push('electricity');
  if (propertyData.internet) amenities.push('internet');
  if (propertyData.security) amenities.push('security');
  if (propertyData.furniture) amenities.push('furniture');
  for (let i = 1; i <= 26; i++) {
    const featureKey = `feature${i}`;
    if (propertyData[featureKey]) amenities.push(featureKey);
  }
  return JSON.stringify(amenities);
}

function buildAmenitiesHouseCreate(propertyData) {
  const amenities = [];
  if (propertyData.pool === 1 || propertyData.pool === true || propertyData.pool === '1') amenities.push('pool');
  if (propertyData.garden === 1 || propertyData.garden === true || propertyData.garden === '1') amenities.push('garden');
  if (propertyData.garage === 1 || propertyData.garage === true || propertyData.garage === '1') amenities.push('garage');
  if (propertyData.parking === 1 || propertyData.parking === true || propertyData.parking === '1') amenities.push('parking');
  if (propertyData.electricity === 1 || propertyData.electricity === true || propertyData.electricity === '1') {
    amenities.push('electricity');
  }
  if (propertyData.internet === 1 || propertyData.internet === true || propertyData.internet === '1') {
    amenities.push('internet');
  }
  if (propertyData.security === 1 || propertyData.security === true || propertyData.security === '1') {
    amenities.push('security');
  }
  if (propertyData.furniture === 1 || propertyData.furniture === true || propertyData.furniture === '1') {
    amenities.push('furniture');
  }
  for (let i = 1; i <= 26; i++) {
    const featureKey = `feature${i}`;
    const featureValue = propertyData[featureKey];
    if (featureValue === 1 || featureValue === true || featureValue === '1') {
      amenities.push(featureKey);
    }
  }
  return JSON.stringify(amenities);
}

function buildAmenitiesHouseUpdate(propertyData) {
  const amenities = [];
  if (propertyData.pool === 1 || propertyData.pool === true || propertyData.pool === '1') amenities.push('pool');
  if (propertyData.garden === 1 || propertyData.garden === true || propertyData.garden === '1') amenities.push('garden');
  if (propertyData.garage === 1 || propertyData.garage === true || propertyData.garage === '1') amenities.push('garage');
  if (propertyData.parking === 1 || propertyData.parking === true || propertyData.parking === '1') amenities.push('parking');
  if (propertyData.electricity === 1 || propertyData.electricity === true || propertyData.electricity === '1') {
    amenities.push('electricity');
  }
  if (propertyData.internet === 1 || propertyData.internet === true || propertyData.internet === '1') {
    amenities.push('internet');
  }
  if (propertyData.security === 1 || propertyData.security === true || propertyData.security === '1') {
    amenities.push('security');
  }
  if (propertyData.furniture === 1 || propertyData.furniture === true || propertyData.furniture === '1') {
    amenities.push('furniture');
  }
  for (let i = 1; i <= 26; i++) {
    const featureKey = `feature${i}`;
    const featureValue = propertyData[featureKey];
    if (featureValue === 1 || featureValue === true || featureValue === '1') {
      amenities.push(featureKey);
    }
  }
  return JSON.stringify(amenities);
}

function parseBedrooms(propertyData) {
  if (propertyData.bedrooms !== undefined && propertyData.bedrooms !== null && propertyData.bedrooms !== '') {
    const parsedBedrooms =
      typeof propertyData.bedrooms === 'number' ? propertyData.bedrooms : parseInt(propertyData.bedrooms, 10);
    if (!isNaN(parsedBedrooms) && isFinite(parsedBedrooms)) return parsedBedrooms;
  }
  return null;
}

function buildApartmentWhere(filters = {}) {
  const w = {};
  if (filters.moderation_status) w.moderation_status = filters.moderation_status;
  if (filters.property_type) w.property_type = filters.property_type;
  if (filters.city) w.city = filters.city;
  if (filters.country) w.country = filters.country;
  if (filters.is_shared_ownership === 1 || filters.is_shared_ownership === true) {
    w.is_shared_ownership = 1;
  }
  return w;
}

function buildHouseWhere(filters = {}) {
  return buildApartmentWhere(filters);
}

function passesApprovedFilters(p) {
  const a = p.is_auction;
  const auctionOff =
    a === 0 ||
    a === null ||
    a === undefined ||
    a === '0' ||
    String(a) === '0';
  if (!auctionOff) return false;
  if (p.sale_type === 'debt') return false;
  if (p.is_debt === 1 || p.has_debt === 1) return false;
  if (['red', 'yellow', 'green'].includes(p.debt_severity)) return false;
  return true;
}

function passesAuctionFilters(p) {
  const a = p.is_auction;
  const auctionOn = a === 1 || a === '1' || String(a) === '1';
  if (!auctionOn) return false;
  const hasEnd = p.auction_end_date != null && String(p.auction_end_date).trim() !== '';
  const hasStartPrice = p.auction_starting_price != null;
  if (!hasEnd && !hasStartPrice) return false;
  if (p.sale_type === 'debt') return false;
  if (p.is_debt === 1 || p.has_debt === 1) return false;
  if (['red', 'yellow', 'green'].includes(p.debt_severity)) return false;
  return true;
}

function passesDebtFilters(p) {
  return (
    p.sale_type === 'debt' ||
    p.is_debt === 1 ||
    p.has_debt === 1 ||
    ['red', 'yellow', 'green'].includes(p.debt_severity)
  );
}

export const apartmentQueries = {
  create: async (propertyData) => {
        const prisma = getPrisma();
    const amenities = buildAmenitiesApartmentCreate(propertyData);
    const data = {
      user_id: Number(propertyData.user_id),
      property_type: propertyData.property_type,
      title: propertyData.title,
      description: propertyData.description ?? null,
      price: propertyData.price ?? null,
      currency: propertyData.currency || 'USD',
      is_auction: propertyData.is_auction ? 1 : 0,
      auction_start_date: propertyData.auction_start_date || null,
      auction_end_date: propertyData.auction_end_date || null,
      auction_starting_price: propertyData.auction_starting_price ?? null,
      area: propertyData.area ?? null,
      living_area: propertyData.living_area ?? null,
      building_type: propertyData.building_type ?? null,
      rooms: propertyData.rooms ?? null,
      bathrooms: propertyData.bathrooms ?? null,
      floor: propertyData.floor ?? null,
      total_floors: propertyData.total_floors ?? null,
      year_built: propertyData.year_built ?? null,
      location: propertyData.location ?? null,
      address: propertyData.address ?? null,
      apartment: propertyData.apartment ?? null,
      country: propertyData.country ?? null,
      city: propertyData.city ?? null,
      coordinates: propertyData.coordinates ? JSON.stringify(propertyData.coordinates) : null,
      amenities,
      renovation: propertyData.renovation ?? null,
      condition: propertyData.condition ?? null,
      heating: propertyData.heating ?? null,
      water_supply: propertyData.water_supply ?? null,
      sewerage: propertyData.sewerage ?? null,
      commercial_type: propertyData.commercial_type ?? null,
      business_hours: propertyData.business_hours ?? null,
      additional_amenities: propertyData.additional_amenities ?? null,
      photos: propertyData.photos ? JSON.stringify(propertyData.photos) : null,
      videos: propertyData.videos ? JSON.stringify(propertyData.videos) : null,
      additional_documents: propertyData.additional_documents ? JSON.stringify(propertyData.additional_documents) : null,
      ownership_document: propertyData.ownership_document ?? null,
      no_debts_document: propertyData.no_debts_document ?? null,
      test_drive: propertyData.test_drive ? 1 : 0,
      test_drive_data: propertyData.test_drive_data ? JSON.stringify(propertyData.test_drive_data) : null,
      is_shared_ownership: propertyData.is_shared_ownership ? 1 : 0,
      total_shares: propertyData.total_shares ?? null,
      shares_sold: propertyData.shares_sold != null ? propertyData.shares_sold : 0,
      moderation_status: propertyData.moderation_status || 'pending',
      sale_type: propertyData.sale_type ?? null,
      is_debt: propertyData.is_debt ? 1 : 0,
      has_debt: propertyData.has_debt ? 1 : 0,
      debt_utilities: propertyData.debt_utilities ? 1 : 0,
      debt_mortgage_pledge: propertyData.debt_mortgage_pledge ? 1 : 0,
      debt_property_taxes: propertyData.debt_property_taxes ? 1 : 0,
      debt_arrest: propertyData.debt_arrest ? 1 : 0,
      debt_inherited: propertyData.debt_inherited ? 1 : 0,
      debt_third_party: propertyData.debt_third_party ? 1 : 0,
      debt_other: propertyData.debt_other ?? null,
      debt_amount: propertyData.debt_amount != null ? propertyData.debt_amount : null,
    };
    const created = await prisma.properties_apartments.create({ data });
    return { lastInsertRowid: created.id, changes: 1 };
  },

  getById: async (id) => {
        const prisma = getPrisma();
    const row = await prisma.properties_apartments.findUnique({ where: { id: Number(id) } });
    if (!row) return null;
    return parseApartmentRow(row);
  },

  getByUserId: async (userId, limit = 50, offset = 0) => {
        const prisma = getPrisma();
    const rows = await prisma.properties_apartments.findMany({
      where: { user_id: Number(userId) },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map((r) => parseApartmentRow({ ...r }));
  },

  getAll: async (filters = {}, limit = 100, offset = 0) => {
        const prisma = getPrisma();
    const rows = await prisma.properties_apartments.findMany({
      where: buildApartmentWhere(filters),
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map((r) => parseApartmentRow({ ...r }));
  },

  update: async (id, propertyData) => {
        const prisma = getPrisma();
    const amenities = buildAmenitiesApartmentUpdate(propertyData);
    const updated = await prisma.properties_apartments.update({
      where: { id: Number(id) },
      data: {
        title: propertyData.title,
        description: propertyData.description ?? null,
        price: propertyData.price ?? null,
        currency: propertyData.currency || 'USD',
        is_auction: propertyData.is_auction ? 1 : 0,
        auction_start_date: propertyData.auction_start_date || null,
        auction_end_date: propertyData.auction_end_date || null,
        auction_starting_price: propertyData.auction_starting_price ?? null,
        area: propertyData.area ?? null,
        living_area: propertyData.living_area ?? null,
        building_type: propertyData.building_type ?? null,
        rooms: propertyData.rooms ?? null,
        bathrooms: propertyData.bathrooms ?? null,
        floor: propertyData.floor ?? null,
        total_floors: propertyData.total_floors ?? null,
        year_built: propertyData.year_built ?? null,
        location: propertyData.location ?? null,
        address: propertyData.address ?? null,
        apartment: propertyData.apartment ?? null,
        country: propertyData.country ?? null,
        city: propertyData.city ?? null,
        coordinates: propertyData.coordinates ? JSON.stringify(propertyData.coordinates) : null,
        amenities,
        renovation: propertyData.renovation ?? null,
        condition: propertyData.condition ?? null,
        heating: propertyData.heating ?? null,
        water_supply: propertyData.water_supply ?? null,
        sewerage: propertyData.sewerage ?? null,
        commercial_type: propertyData.commercial_type ?? null,
        business_hours: propertyData.business_hours ?? null,
        additional_amenities: propertyData.additional_amenities ?? null,
        photos: propertyData.photos ? JSON.stringify(propertyData.photos) : null,
        videos: propertyData.videos ? JSON.stringify(propertyData.videos) : null,
        additional_documents: propertyData.additional_documents ? JSON.stringify(propertyData.additional_documents) : null,
        ownership_document: propertyData.ownership_document ?? null,
        no_debts_document: propertyData.no_debts_document ?? null,
        test_drive: propertyData.test_drive ? 1 : 0,
        test_drive_data: propertyData.test_drive_data ? JSON.stringify(propertyData.test_drive_data) : null,
        updated_at: new Date().toISOString(),
      },
    });
    return { changes: 1 };
  },

  delete: async (id) => {
        const prisma = getPrisma();
    await prisma.properties_apartments.delete({ where: { id: Number(id) } });
    return { changes: 1 };
  },

  updateModerationStatus: async (id, status, reviewedBy = null, rejectionReason = null, debtSeverity = null) => {
        const prisma = getPrisma();
    const updated = await prisma.properties_apartments.update({
      where: { id: Number(id) },
      data: {
        moderation_status: status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
        debt_severity: debtSeverity != null ? debtSeverity : undefined,
      },
    });
    return { changes: 1 };
  },

  reserve: async (id, userId, purchaseRequestId) => {
        const prisma = getPrisma();
    const reservedUntil = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const updated = await prisma.properties_apartments.update({
      where: { id: Number(id) },
      data: {
        reserved_until: reservedUntil,
        reserved_by: Number(userId),
        purchase_request_id: Number(purchaseRequestId),
      },
    });
    return { changes: 1 };
  },

  unreserve: async (id) => {
        const prisma = getPrisma();
    const updated = await prisma.properties_apartments.update({
      where: { id: Number(id) },
      data: { reserved_until: null, reserved_by: null, purchase_request_id: null },
    });
    return { changes: 1 };
  },

  isReserved: async (id) => {
        const prisma = getPrisma();
    const result = await prisma.properties_apartments.findUnique({
      where: { id: Number(id) },
      select: { reserved_until: true, reserved_by: true, purchase_request_id: true },
    });
    if (!result || !result.reserved_until) {
      return { isReserved: false };
    }
    const reservedUntil = new Date(result.reserved_until);
    const now = new Date();
    if (reservedUntil < now) {
      await apartmentQueries.unreserve(id);
      return { isReserved: false };
    }
    return {
      isReserved: true,
      reservedUntil: result.reserved_until,
      reservedBy: result.reserved_by,
      purchaseRequestId: result.purchase_request_id,
      timeRemaining: reservedUntil - now,
    };
  },
};

export const houseQueries = {
  create: async (propertyData) => {
        const prisma = getPrisma();
    const amenities = buildAmenitiesHouseCreate(propertyData);
    const data = {
      user_id: Number(propertyData.user_id),
      property_type: propertyData.property_type,
      title: propertyData.title,
      description: propertyData.description ?? null,
      price: propertyData.price ?? null,
      currency: propertyData.currency || 'USD',
      is_auction: propertyData.is_auction ? 1 : 0,
      auction_start_date: propertyData.auction_start_date || null,
      auction_end_date: propertyData.auction_end_date || null,
      auction_starting_price: propertyData.auction_starting_price ?? null,
      area: propertyData.area ?? null,
      living_area: propertyData.living_area ?? null,
      land_area: propertyData.land_area ?? null,
      building_type: propertyData.building_type ?? null,
      bedrooms: parseBedrooms(propertyData),
      bathrooms: propertyData.bathrooms ?? null,
      floors: propertyData.floors ?? null,
      year_built: propertyData.year_built ?? null,
      location: propertyData.location ?? null,
      address: propertyData.address ?? null,
      country: propertyData.country ?? null,
      city: propertyData.city ?? null,
      coordinates: propertyData.coordinates ? JSON.stringify(propertyData.coordinates) : null,
      amenities,
      renovation: propertyData.renovation ?? null,
      condition: propertyData.condition ?? null,
      heating: propertyData.heating ?? null,
      water_supply: propertyData.water_supply ?? null,
      sewerage: propertyData.sewerage ?? null,
      additional_amenities: propertyData.additional_amenities ?? null,
      photos: propertyData.photos ? JSON.stringify(propertyData.photos) : null,
      videos: propertyData.videos ? JSON.stringify(propertyData.videos) : null,
      additional_documents: propertyData.additional_documents ? JSON.stringify(propertyData.additional_documents) : null,
      ownership_document: propertyData.ownership_document ?? null,
      no_debts_document: propertyData.no_debts_document ?? null,
      test_drive: propertyData.test_drive ? 1 : 0,
      test_drive_data: propertyData.test_drive_data ? JSON.stringify(propertyData.test_drive_data) : null,
      is_shared_ownership: propertyData.is_shared_ownership ? 1 : 0,
      total_shares: propertyData.total_shares ?? null,
      shares_sold: propertyData.shares_sold != null ? propertyData.shares_sold : 0,
      moderation_status: propertyData.moderation_status || 'pending',
      sale_type: propertyData.sale_type ?? null,
      is_debt: propertyData.is_debt ? 1 : 0,
      has_debt: propertyData.has_debt ? 1 : 0,
      debt_utilities: propertyData.debt_utilities ? 1 : 0,
      debt_mortgage_pledge: propertyData.debt_mortgage_pledge ? 1 : 0,
      debt_property_taxes: propertyData.debt_property_taxes ? 1 : 0,
      debt_arrest: propertyData.debt_arrest ? 1 : 0,
      debt_inherited: propertyData.debt_inherited ? 1 : 0,
      debt_third_party: propertyData.debt_third_party ? 1 : 0,
      debt_other: propertyData.debt_other ?? null,
      debt_amount: propertyData.debt_amount != null ? propertyData.debt_amount : null,
    };
    const created = await prisma.properties_houses.create({ data });
    return { lastInsertRowid: created.id, changes: 1 };
  },

  getById: async (id) => {
        const prisma = getPrisma();
    const row = await prisma.properties_houses.findUnique({ where: { id: Number(id) } });
    if (!row) return null;
    return parseHouseRow(row);
  },

  getByUserId: async (userId, limit = 50, offset = 0) => {
        const prisma = getPrisma();
    const rows = await prisma.properties_houses.findMany({
      where: { user_id: Number(userId) },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map((r) => parseHouseRow({ ...r }));
  },

  getAll: async (filters = {}, limit = 100, offset = 0) => {
        const prisma = getPrisma();
    const rows = await prisma.properties_houses.findMany({
      where: buildHouseWhere(filters),
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map((r) => parseHouseRow({ ...r }));
  },

  update: async (id, propertyData) => {
        const prisma = getPrisma();
    const amenities = buildAmenitiesHouseUpdate(propertyData);
    const updated = await prisma.properties_houses.update({
      where: { id: Number(id) },
      data: {
        title: propertyData.title,
        description: propertyData.description ?? null,
        price: propertyData.price ?? null,
        currency: propertyData.currency || 'USD',
        is_auction: propertyData.is_auction ? 1 : 0,
        auction_start_date: propertyData.auction_start_date || null,
        auction_end_date: propertyData.auction_end_date || null,
        auction_starting_price: propertyData.auction_starting_price ?? null,
        area: propertyData.area ?? null,
        living_area: propertyData.living_area ?? null,
        land_area: propertyData.land_area ?? null,
        building_type: propertyData.building_type ?? null,
        bedrooms: parseBedrooms(propertyData),
        bathrooms: propertyData.bathrooms ?? null,
        floors: propertyData.floors ?? null,
        year_built: propertyData.year_built ?? null,
        location: propertyData.location ?? null,
        address: propertyData.address ?? null,
        country: propertyData.country ?? null,
        city: propertyData.city ?? null,
        coordinates: propertyData.coordinates ? JSON.stringify(propertyData.coordinates) : null,
        amenities,
        renovation: propertyData.renovation ?? null,
        condition: propertyData.condition ?? null,
        heating: propertyData.heating ?? null,
        water_supply: propertyData.water_supply ?? null,
        sewerage: propertyData.sewerage ?? null,
        additional_amenities: propertyData.additional_amenities ?? null,
        photos: propertyData.photos ? JSON.stringify(propertyData.photos) : null,
        videos: propertyData.videos ? JSON.stringify(propertyData.videos) : null,
        additional_documents: propertyData.additional_documents ? JSON.stringify(propertyData.additional_documents) : null,
        ownership_document: propertyData.ownership_document ?? null,
        no_debts_document: propertyData.no_debts_document ?? null,
        test_drive: propertyData.test_drive ? 1 : 0,
        test_drive_data: propertyData.test_drive_data ? JSON.stringify(propertyData.test_drive_data) : null,
        updated_at: new Date().toISOString(),
      },
    });
    return { changes: 1 };
  },

  delete: async (id) => {
        const prisma = getPrisma();
    await prisma.properties_houses.delete({ where: { id: Number(id) } });
    return { changes: 1 };
  },

  updateModerationStatus: async (id, status, reviewedBy = null, rejectionReason = null, debtSeverity = null) => {
        const prisma = getPrisma();
    const updated = await prisma.properties_houses.update({
      where: { id: Number(id) },
      data: {
        moderation_status: status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
        debt_severity: debtSeverity != null ? debtSeverity : undefined,
      },
    });
    return { changes: 1 };
  },

  reserve: async (id, userId, purchaseRequestId) => {
        const prisma = getPrisma();
    const reservedUntil = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const updated = await prisma.properties_houses.update({
      where: { id: Number(id) },
      data: {
        reserved_until: reservedUntil,
        reserved_by: Number(userId),
        purchase_request_id: Number(purchaseRequestId),
      },
    });
    return { changes: 1 };
  },

  unreserve: async (id) => {
        const prisma = getPrisma();
    const updated = await prisma.properties_houses.update({
      where: { id: Number(id) },
      data: { reserved_until: null, reserved_by: null, purchase_request_id: null },
    });
    return { changes: 1 };
  },

  isReserved: async (id) => {
        const prisma = getPrisma();
    const result = await prisma.properties_houses.findUnique({
      where: { id: Number(id) },
      select: { reserved_until: true, reserved_by: true, purchase_request_id: true },
    });
    if (!result || !result.reserved_until) {
      return { isReserved: false };
    }
    const reservedUntil = new Date(result.reserved_until);
    const now = new Date();
    if (reservedUntil < now) {
      await houseQueries.unreserve(id);
      return { isReserved: false };
    }
    return {
      isReserved: true,
      reservedUntil: result.reserved_until,
      reservedBy: result.reserved_by,
      purchaseRequestId: result.purchase_request_id,
      timeRemaining: reservedUntil - now,
    };
  },
};

export const propertyQueries = {
  getAll: async (filters = {}, limit = 100, offset = 0) => {
        const [apartments, houses] = await Promise.all([
      apartmentQueries.getAll(filters, limit, offset),
      houseQueries.getAll(filters, limit, offset),
    ]);
    const all = [...apartments, ...houses].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return all.slice(0, limit);
  },

  getCount: async (filters = {}) => {
        const prisma = getPrisma();
    const wA = buildApartmentWhere(filters);
    const wH = buildHouseWhere(filters);
    const [c1, c2] = await Promise.all([
      prisma.properties_apartments.count({ where: wA }),
      prisma.properties_houses.count({ where: wH }),
    ]);
    return c1 + c2;
  },

  getApprovedCount: async function () {
        return await this.getCount({ moderation_status: 'approved' });
  },

  getAuctionsCount: async () => {
        const prisma = getPrisma();
    const [aptRows, houseRows] = await Promise.all([
      prisma.properties_apartments.findMany({
        where: { moderation_status: 'approved' },
        select: { is_auction: true },
      }),
      prisma.properties_houses.findMany({
        where: { moderation_status: 'approved' },
        select: { is_auction: true },
      }),
    ]);
    const countAuction = (rows) => rows.filter((r) => r.is_auction === 1 || r.is_auction === '1').length;
    return countAuction(aptRows) + countAuction(houseRows);
  },

  getCategoryStatsByType: async () => {
        const prisma = getPrisma();
    const [apt, house] = await Promise.all([
      prisma.properties_apartments.groupBy({
        by: ['property_type'],
        where: { moderation_status: 'approved' },
        _count: { _all: true },
      }),
      prisma.properties_houses.groupBy({
        by: ['property_type'],
        where: { moderation_status: 'approved' },
        _count: { _all: true },
      }),
    ]);
    const order = ['villa', 'house', 'apartment', 'commercial'];
    const map = {};
    apt.forEach((r) => {
      map[r.property_type] = (map[r.property_type] || 0) + r._count._all;
    });
    house.forEach((r) => {
      map[r.property_type] = (map[r.property_type] || 0) + r._count._all;
    });
    const result = [];
    order.forEach((t) => {
      if (map[t] != null) result.push({ type: t, count: map[t] });
    });
    return result;
  },

  getCategoryStatsBySection: async () => {
        const prisma = getPrisma();
    const tables = [
      () => prisma.properties_apartments,
      () => prisma.properties_houses,
    ];
    let debt = 0;
    let auction = 0;
    let share = 0;
    let totalApproved = 0;
    for (const getDelegate of tables) {
      const d = getDelegate();
      const approved = await d.findMany({ where: { moderation_status: 'approved' } });
      totalApproved += approved.length;
      debt += approved.filter(
        (p) =>
          p.sale_type === 'debt' ||
          p.is_debt === 1 ||
          p.has_debt === 1
      ).length;
      auction += approved.filter((p) => {
        const aOn = p.is_auction === 1 || p.is_auction === '1';
        const notDebtSale = p.sale_type !== 'debt';
        const noDebtFlags = (p.is_debt == null || p.is_debt === 0) && (p.has_debt == null || p.has_debt === 0);
        return (
          aOn &&
          notDebtSale &&
          noDebtFlags &&
          (p.debt_severity == null || !['red', 'yellow', 'green'].includes(p.debt_severity))
        );
      }).length;
      share += approved.filter((p) => {
        const isShare = p.sale_type === 'share' || p.is_shared_ownership === 1;
        const notAuction = p.is_auction == null || p.is_auction === 0 || p.is_auction === '0';
        const notDebtSale = p.sale_type !== 'debt';
        const noDebtFlags = (p.is_debt == null || p.is_debt === 0) && (p.has_debt == null || p.has_debt === 0);
        return (
          isShare &&
          notAuction &&
          notDebtSale &&
          noDebtFlags &&
          (p.debt_severity == null || !['red', 'yellow', 'green'].includes(p.debt_severity))
        );
      }).length;
    }
    const buyNow = Math.max(0, totalApproved - debt - auction - share);
    const out = [];
    if (auction > 0) out.push({ section: 'auction', count: auction });
    if (buyNow > 0) out.push({ section: 'buy_now', count: buyNow });
    if (share > 0) out.push({ section: 'share', count: share });
    if (debt > 0) out.push({ section: 'debt', count: debt });
    return out;
  },

  getShares: async (limit = 100, offset = 0) => {
        const [apartments, houses] = await Promise.all([
      apartmentQueries.getAll({ moderation_status: 'approved', is_shared_ownership: 1 }, limit, offset),
      houseQueries.getAll({ moderation_status: 'approved', is_shared_ownership: 1 }, limit, offset),
    ]);
    const combined = [...apartments, ...houses].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return combined.slice(0, limit);
  },

  getByUserId: async (userId, limit = 50, offset = 0) => {
        const [apartments, houses] = await Promise.all([
      apartmentQueries.getByUserId(userId, limit, offset),
      houseQueries.getByUserId(userId, limit, offset),
    ]);
    const all = [...apartments, ...houses].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return all.slice(0, limit);
  },

  getById: async (id, propertyType = null) => {
        const prisma = getPrisma();
    const nid = Number(id);

    if (propertyType === 'apartment' || propertyType === 'commercial') {
      const property = await apartmentQueries.getById(nid);
      if (property) {
        const pt = property.property_type;
        if (pt === 'apartment' || pt === 'commercial') {
          property.source_table = 'properties_apartments';
          return property;
        }
        return null;
      }
      return null;
    }
    if (propertyType === 'house' || propertyType === 'villa') {
      const property = await houseQueries.getById(nid);
      if (property) {
        const pt = property.property_type;
        if (pt === 'house' || pt === 'villa') {
          property.source_table = 'properties_houses';
          return property;
        }
        return null;
      }
      return null;
    }

    const propertyInHouses = await houseQueries.getById(nid);
    const propertyInApartments = await apartmentQueries.getById(nid);

    if (propertyInHouses && propertyInApartments) {
      if (propertyInHouses.property_type === 'house' || propertyInHouses.property_type === 'villa') {
        propertyInHouses.source_table = 'properties_houses';
        return propertyInHouses;
      }
      if (propertyInApartments.property_type === 'apartment' || propertyInApartments.property_type === 'commercial') {
        propertyInApartments.source_table = 'properties_apartments';
        return propertyInApartments;
      }
      propertyInHouses.source_table = 'properties_houses';
      return propertyInHouses;
    }
    if (propertyInHouses) {
      if (propertyInHouses.property_type === 'house' || propertyInHouses.property_type === 'villa') {
        propertyInHouses.source_table = 'properties_houses';
        return propertyInHouses;
      }
    }
    if (propertyInApartments) {
      if (propertyInApartments.property_type === 'apartment' || propertyInApartments.property_type === 'commercial') {
        propertyInApartments.source_table = 'properties_apartments';
        return propertyInApartments;
      }
    }

    const legacy = await prisma.properties.findUnique({ where: { id: nid } });
    if (legacy) {
      legacy.source_table = 'properties';
      return legacy;
    }
    return null;
  },

  updateModerationStatus: async (id, status, reviewedBy = null, rejectionReason = null, debtSeverity = null) => {
        const prisma = getPrisma();
    const nid = Number(id);
    let propertyInHouses = null;
    let propertyInApartments = null;
    try {
      propertyInHouses = await prisma.properties_houses.findUnique({
        where: { id: nid },
        select: { id: true, property_type: true, moderation_status: true },
      });
    } catch {
      /* ignore */
    }
    try {
      propertyInApartments = await prisma.properties_apartments.findUnique({
        where: { id: nid },
        select: { id: true, property_type: true, moderation_status: true },
      });
    } catch {
      /* ignore */
    }

    if (propertyInHouses && propertyInApartments) {
      if (propertyInHouses.property_type === 'house' || propertyInHouses.property_type === 'villa') {
        await prisma.properties_apartments.delete({ where: { id: nid } }).catch(() => {});
        propertyInApartments = null;
      } else if (
        propertyInApartments.property_type === 'apartment' ||
        propertyInApartments.property_type === 'commercial'
      ) {
        await prisma.properties_houses.delete({ where: { id: nid } }).catch(() => {});
        propertyInHouses = null;
      } else if (propertyInHouses.moderation_status === 'pending') {
        propertyInApartments = null;
      } else if (propertyInApartments.moderation_status === 'pending') {
        propertyInHouses = null;
      }
    }

    if (propertyInHouses) {
      if (propertyInHouses.property_type !== 'house' && propertyInHouses.property_type !== 'villa') {
        propertyInHouses = null;
      } else {
        const r = await houseQueries.updateModerationStatus(nid, status, reviewedBy, rejectionReason, debtSeverity);
        return r;
      }
    }
    if (propertyInApartments) {
      if (propertyInApartments.property_type !== 'apartment' && propertyInApartments.property_type !== 'commercial') {
        propertyInApartments = null;
      } else {
        const r = await apartmentQueries.updateModerationStatus(
          nid,
          status,
          reviewedBy,
          rejectionReason,
          debtSeverity
        );
        return r;
      }
    }

    const legacy = await prisma.properties.findUnique({ where: { id: nid } });
    if (legacy) {
      await prisma.properties.update({
        where: { id: nid },
        data: {
          moderation_status: status,
          reviewed_by: reviewedBy,
          reviewed_at: new Date(),
          rejection_reason: rejectionReason,
          updated_at: new Date(),
        },
      });
      return { changes: 1 };
    }
    throw new Error(`Объявление с ID ${id} не найдено ни в одной таблице`);
  },

  delete: async (id) => {
        const prisma = getPrisma();
    const nid = Number(id);
    try {
      await prisma.properties_apartments.delete({ where: { id: nid } });
      return { changes: 1 };
    } catch {
      /* try houses */
    }
    try {
      await prisma.properties_houses.delete({ where: { id: nid } });
      return { changes: 1 };
    } catch {
      /* try legacy */
    }
    try {
      await prisma.properties.delete({ where: { id: nid } });
      return { changes: 1 };
    } catch (e) {
      throw new Error(`Объявление с ID ${id} не найдено ни в одной таблице`);
    }
  },

  update: async (id, propertyData) => {
        const property = await propertyQueries.getById(id);
    if (!property) {
      throw new Error(`Объявление с ID ${id} не найдено`);
    }
    if (property.property_type === 'apartment' || property.property_type === 'commercial') {
      return apartmentQueries.update(id, propertyData);
    }
    if (property.property_type === 'house' || property.property_type === 'villa') {
      return houseQueries.update(id, propertyData);
    }
    throw new Error(`Неизвестный тип объявления: ${property.property_type}`);
  },

  getUserProperties: async (userId) => {
        const prisma = getPrisma();
    const uid = Number(userId);
    const [aptRows, houseRows] = await Promise.all([
      prisma.properties_apartments.findMany({
        where: { user_id: uid },
        include: { users: true },
        orderBy: { created_at: 'desc' },
      }),
      prisma.properties_houses.findMany({
        where: { user_id: uid },
        include: { users: true },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    const apartments = mapListWithUserParse(aptRows, 'apt');
    const houses = mapListWithUserParse(houseRows, 'house');
    const all = [...apartments, ...houses].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return all;
  },

  reserve: async (id, userId, purchaseRequestId) => {
        const property = await propertyQueries.getById(id);
    if (!property) {
      throw new Error(`Объект с ID ${id} не найден`);
    }
    const sourceTable = property.source_table;
    const isApartmentsTable = sourceTable === 'apartments' || sourceTable === 'properties_apartments';
    const isHousesTable = sourceTable === 'houses' || sourceTable === 'properties_houses';
    if (!sourceTable) {
      if (property.property_type === 'apartment' || property.property_type === 'commercial') {
        return apartmentQueries.reserve(id, userId, purchaseRequestId);
      }
      if (property.property_type === 'house' || property.property_type === 'villa') {
        return houseQueries.reserve(id, userId, purchaseRequestId);
      }
      throw new Error(`Неизвестный тип объекта: ${property.property_type}`);
    }
    if (isApartmentsTable) return apartmentQueries.reserve(id, userId, purchaseRequestId);
    if (isHousesTable) return houseQueries.reserve(id, userId, purchaseRequestId);
    throw new Error(`Неизвестный тип объекта: source_table=${sourceTable}`);
  },

  unreserve: async (id) => {
        const property = await propertyQueries.getById(id);
    if (!property) {
      throw new Error('Объект не найден');
    }
    const sourceTable = property.source_table;
    const isApartmentsTable = sourceTable === 'apartments' || sourceTable === 'properties_apartments';
    const isHousesTable = sourceTable === 'houses' || sourceTable === 'properties_houses';
    if (isApartmentsTable) return apartmentQueries.unreserve(id);
    if (isHousesTable) return houseQueries.unreserve(id);
    throw new Error('Неизвестный тип объекта');
  },

  /**
   * Завершение сделки «Купить сейчас» менеджером: снять бронь, зафиксировать победителя.
   */
  markBuyNowSaleComplete: async (id, winnerUserId) => {
        const property = await propertyQueries.getById(id);
    if (!property) {
      throw new Error('Объект не найден');
    }
    const winId = Number(winnerUserId);
    if (!Number.isFinite(winId)) {
      throw new Error('Некорректный покупатель');
    }
    const prisma = getPrisma();
    const completedAt = new Date().toISOString();
    const data = {
      reserved_until: null,
      reserved_by: null,
      purchase_request_id: null,
      buy_now_winner_user_id: winId,
      buy_now_completed_at: completedAt,
      updated_at: completedAt,
    };
    const nid = Number(id);
    const sourceTable = property.source_table;
    const isApartmentsTable = sourceTable === 'apartments' || sourceTable === 'properties_apartments';
    const isHousesTable = sourceTable === 'houses' || sourceTable === 'properties_houses';
    if (isApartmentsTable) {
      await prisma.properties_apartments.update({ where: { id: nid }, data });
      return { ok: true };
    }
    if (isHousesTable) {
      await prisma.properties_houses.update({ where: { id: nid }, data });
      return { ok: true };
    }
    if (property.property_type === 'apartment' || property.property_type === 'commercial') {
      await prisma.properties_apartments.update({ where: { id: nid }, data });
      return { ok: true };
    }
    if (property.property_type === 'house' || property.property_type === 'villa') {
      await prisma.properties_houses.update({ where: { id: nid }, data });
      return { ok: true };
    }
    throw new Error('Неизвестный тип объекта');
  },

  isReserved: async (id) => {
        const property = await propertyQueries.getById(id);
    if (!property) {
      return { isReserved: false };
    }
    const sourceTable = property.source_table;
    if (!sourceTable) {
      if (property.property_type === 'apartment' || property.property_type === 'commercial') {
        return apartmentQueries.isReserved(id);
      }
      if (property.property_type === 'house' || property.property_type === 'villa') {
        return houseQueries.isReserved(id);
      }
      return { isReserved: false };
    }
    const isApartmentsTable = sourceTable === 'apartments' || sourceTable === 'properties_apartments';
    const isHousesTable = sourceTable === 'houses' || sourceTable === 'properties_houses';
    if (isApartmentsTable) return apartmentQueries.isReserved(id);
    if (isHousesTable) return houseQueries.isReserved(id);
    return { isReserved: false };
  },

  getApproved: async (propertyType = null) => {
        const prisma = getPrisma();
    const whereA = { moderation_status: 'approved' };
    const whereH = { moderation_status: 'approved' };
    if (propertyType) {
      whereA.property_type = propertyType;
      whereH.property_type = propertyType;
    }
    const [aptRows, houseRows] = await Promise.all([
      prisma.properties_apartments.findMany({ where: whereA, include: { users: true } }),
      prisma.properties_houses.findMany({ where: whereH, include: { users: true } }),
    ]);
    const apartments = mapListWithUserParse(aptRows, 'apt').filter((p) => p && passesApprovedFilters(p));
    const houses = mapListWithUserParse(houseRows, 'house').filter((p) => p && passesApprovedFilters(p));
    const all = [...apartments, ...houses].sort((a, b) => {
      const dateA = new Date(a.reviewed_at || a.created_at);
      const dateB = new Date(b.reviewed_at || b.created_at);
      return dateB - dateA;
    });
    return all;
  },

  getAuctions: async (propertyType = null) => {
        const prisma = getPrisma();
    const whereA = { moderation_status: 'approved' };
    const whereH = { moderation_status: 'approved' };
    if (propertyType) {
      whereA.property_type = propertyType;
      whereH.property_type = propertyType;
    }
    const [aptRows, houseRows] = await Promise.all([
      prisma.properties_apartments.findMany({ where: whereA, include: { users: true } }),
      prisma.properties_houses.findMany({ where: whereH, include: { users: true } }),
    ]);
    const apartments = mapListWithUserParse(aptRows, 'apt').filter((p) => p && passesAuctionFilters(p));
    const houses = mapListWithUserParse(houseRows, 'house').filter((p) => p && passesAuctionFilters(p));
    const all = [...apartments, ...houses].sort(
      (a, b) => new Date(a.auction_end_date) - new Date(b.auction_end_date)
    );
    return all;
  },

  getDebts: async (propertyType = null) => {
        const prisma = getPrisma();
    const whereA = { moderation_status: 'approved' };
    const whereH = { moderation_status: 'approved' };
    if (propertyType) {
      whereA.property_type = propertyType;
      whereH.property_type = propertyType;
    }
    const [aptRows, houseRows] = await Promise.all([
      prisma.properties_apartments.findMany({ where: whereA, include: { users: true } }),
      prisma.properties_houses.findMany({ where: whereH, include: { users: true } }),
    ]);
    const apartments = mapListWithUserParse(aptRows, 'apt').filter((p) => p && passesDebtFilters(p));
    const houses = mapListWithUserParse(houseRows, 'house').filter((p) => p && passesDebtFilters(p));
    const all = [...apartments, ...houses].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return all;
  },

  getPending: async () => {
        const prisma = getPrisma();
    const [aptRows, houseRows, legacyRows] = await Promise.all([
      prisma.properties_apartments.findMany({
        where: {
          moderation_status: 'pending',
          OR: [{ property_type: 'apartment' }, { property_type: 'commercial' }],
        },
        include: { users: true },
        orderBy: { created_at: 'desc' },
      }),
      prisma.properties_houses.findMany({
        where: {
          moderation_status: 'pending',
          OR: [{ property_type: 'house' }, { property_type: 'villa' }],
        },
        include: { users: true },
        orderBy: { created_at: 'desc' },
      }),
      prisma.properties.findMany({
        where: { moderation_status: 'pending' },
        include: { users: true },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    const apartments = mapListWithUserParse(aptRows, 'apt');
    const houses = mapListWithUserParse(houseRows, 'house');
    const existingIds = new Set(
      [...apartments, ...houses]
        .map((item) => Number(item?.id))
        .filter((id) => Number.isFinite(id))
    );
    const legacy = legacyRows
      .filter((row) => !existingIds.has(Number(row.id)))
      .map((row) => {
        const { users, ...rest } = row;
        return {
          ...rest,
          first_name: users?.first_name ?? null,
          last_name: users?.last_name ?? null,
          email: users?.email ?? null,
          phone_number: users?.phone_number ?? null,
          role: users?.role ?? null,
          source_table: row.source_table || 'properties',
        };
      });
    const all = [...apartments, ...houses, ...legacy].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return all;
  },

  getPendingProperties: async function () {
    return await this.getPending();
  },
};
