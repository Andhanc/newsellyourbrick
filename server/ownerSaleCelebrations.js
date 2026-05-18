/**
 * События для поздравления продавца (аукцион после таймера, купить сейчас, доли, долги).
 * Используется GET /api/owner/:userId/sale-celebrations — только «свежие» за MAX_AGE_MS.
 */

const MAX_AGE_MS = 21 * 86400 * 1000;
const VIP_CLUB_PUBLICATION_FEE_MAJOR = (() => {
  const raw = Number(String(process.env.VIP_CLUB_PUBLICATION_FEE_MAJOR || '299').trim());
  return Number.isFinite(raw) && raw > 0 ? raw : 299;
})();
const VIP_CLUB_PUBLICATION_FEE_CURRENCY = String(
  process.env.STRIPE_SUBSCRIPTION_CURRENCY || process.env.STRIPE_BILLING_CURRENCY || 'EUR'
).toUpperCase();

function parsePhotosField(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function firstCover(photosField) {
  const arr = parsePhotosField(photosField);
  const first = arr[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && first.url) return String(first.url);
  return null;
}

function isDebtRow(p) {
  return (
    p &&
    (p.sale_type === 'debt' ||
      p.is_debt === 1 ||
      p.is_debt === true ||
      p.has_debt === 1 ||
      p.has_debt === true)
  );
}

function isShareRow(p) {
  return (
    p &&
    (p.is_share === 1 ||
      p.is_share === true ||
      p.sale_type === 'share' ||
      p.is_shared_ownership === 1 ||
      p.is_shared_ownership === true ||
      p.is_shared === 1 ||
      p.is_shared === true)
  );
}

function hadCircularAuctionRow(p) {
  if (!p) return false;
  const dur = Number(p.test_timer_duration);
  if (Number.isFinite(dur) && dur > 0) return true;
  const end = p.test_timer_end_date;
  return end != null && String(end).trim() !== '';
}

function isAuctionRow(p) {
  return p && (p.is_auction === 1 || p.is_auction === true || p.is_auction === '1' || p.is_auction === 'true');
}

function isApprovedRow(p) {
  return String(p?.moderation_status || '').toLowerCase() === 'approved';
}

function isPrivateClubOnlyRow(p) {
  return p && (p.private_club_only === 1 || p.private_club_only === true || p.private_club_only === '1');
}

function occurredMs(iso) {
  if (iso == null || iso === '') return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function isFresh(iso) {
  const t = occurredMs(iso);
  if (!t) return false;
  return Date.now() - t <= MAX_AGE_MS;
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {number} uid
 */
export async function buildOwnerSaleCelebrations(prisma, uid) {
  const [apartments, houses] = await Promise.all([
    prisma.properties_apartments.findMany({ where: { user_id: uid } }),
    prisma.properties_houses.findMany({ where: { user_id: uid } }),
  ]);

  const attachMeta = (row, sourceTable) => {
    const photos = parsePhotosField(row.photos);
    const tbl =
      row.property_type === 'house' || row.property_type === 'villa'
        ? 'properties_houses'
        : 'properties_apartments';
    return {
      ...row,
      source_table: sourceTable,
      property_table: tbl,
      photos,
      cover_url: firstCover(row.photos),
    };
  };

  const ownerProps = [
    ...apartments.map((r) => attachMeta(r, 'apartments')),
    ...houses.map((r) => attachMeta(r, 'houses')),
  ];

  const propByKey = new Map();
  for (const p of ownerProps) {
    propByKey.set(`${p.property_table}:${Number(p.id)}`, p);
  }

  const aptIds = apartments.map((p) => Number(p.id)).filter(Number.isFinite);
  const houseIds = houses.map((p) => Number(p.id)).filter(Number.isFinite);
  const orWinner = [];
  if (aptIds.length) {
    orWinner.push({ property_id: { in: aptIds }, property_table: 'properties_apartments' });
  }
  if (houseIds.length) {
    orWinner.push({ property_id: { in: houseIds }, property_table: 'properties_houses' });
  }

  let winners = [];
  if (orWinner.length) {
    winners = await prisma.auction_winners.findMany({
      where: { OR: orWinner },
      orderBy: { won_at: 'desc' },
    });
  }

  const winnerDedup = [];
  const seenWinner = new Set();
  for (const w of winners) {
    const tbl = w.property_table === 'properties_houses' ? 'properties_houses' : 'properties_apartments';
    const k = `${tbl}:${Number(w.property_id)}`;
    if (seenWinner.has(k)) continue;
    seenWinner.add(k);
    winnerDedup.push({ ...w, property_table: tbl });
  }

  const winnerKeySet = new Set(winnerDedup.map((w) => `${w.property_table}:${Number(w.property_id)}`));

  const events = [];

  for (const w of winnerDedup) {
    const p = propByKey.get(`${w.property_table}:${Number(w.property_id)}`);
    if (!p) continue;
    const debt = isDebtRow(p);
    const amount = Number(w.winning_bid_amount) || 0;
    const currency = w.currency || p.currency || 'USD';
    const occurred_at = w.won_at ? String(w.won_at) : new Date().toISOString();
    if (!isFresh(occurred_at)) continue;

    const common = {
      event_id: `aw:${w.id}`,
      property_id: p.id,
      property_type: p.property_type,
      property_table: w.property_table,
      source_table: p.source_table,
      title: p.title || '',
      location: p.location || '',
      currency,
      sale_amount: amount,
      cover_url: p.cover_url || null,
      photos: p.photos,
      occurred_at,
    };

    if (debt) {
      events.push({ ...common, sale_channel: 'debt_winner' });
      continue;
    }
    if (isAuctionRow(p) && hadCircularAuctionRow(p)) {
      events.push({ ...common, sale_channel: 'auction_timer' });
    }
  }

  const shareProps = ownerProps.filter((p) => isShareRow(p));
  const sharePropsById = new Map(shareProps.map((p) => [Number(p.id), p]));
  const shareIds = [...sharePropsById.keys()].filter(Number.isFinite);

  if (shareIds.length) {
    const purchases = await prisma.property_shares.findMany({
      where: { property_id: { in: shareIds }, status: 'completed' },
      orderBy: { id: 'desc' },
    });
    for (const row of purchases) {
      const p = sharePropsById.get(Number(row.property_id));
      if (!p) continue;
      const pt = String(row.property_type || '').toLowerCase();
      const ppt = String(p.property_type || '').toLowerCase();
      if (pt !== ppt && !(ppt === 'commercial' && pt === 'apartment')) continue;

      const purchaseDate = row.purchase_date ? new Date(row.purchase_date).toISOString() : new Date().toISOString();
      if (!isFresh(purchaseDate)) continue;

      events.push({
        event_id: `ps:${row.id}`,
        sale_channel: 'share_purchase',
        property_id: p.id,
        property_type: p.property_type,
        property_table: p.property_table,
        source_table: p.source_table,
        title: p.title || '',
        location: p.location || '',
        currency: row.currency || p.currency || 'USD',
        sale_amount: Number(row.total_price) || 0,
        shares_count: Number(row.shares_count) || 0,
        cover_url: p.cover_url || null,
        photos: p.photos,
        occurred_at: purchaseDate,
      });
    }
  }

  for (const p of ownerProps) {
    const bn = p.buy_now_completed_at != null && String(p.buy_now_completed_at).trim() !== '';
    if (!bn) continue;
    if (isShareRow(p)) continue;
    const k = `${p.property_table}:${Number(p.id)}`;
    if (winnerKeySet.has(k)) continue;

    const rawAt = p.buy_now_completed_at;
    const occurred_at =
      typeof rawAt === 'string' ? rawAt : rawAt instanceof Date ? rawAt.toISOString() : String(rawAt);
    if (!isFresh(occurred_at)) continue;

    const debt = isDebtRow(p);
    const amount = Number(p.price) || 0;
    const event_id = `bn:${p.property_table}:${p.id}:${occurredMs(occurred_at)}`;

    const common = {
      event_id,
      property_id: p.id,
      property_type: p.property_type,
      property_table: p.property_table,
      source_table: p.source_table,
      title: p.title || '',
      location: p.location || '',
      currency: p.currency || 'USD',
      sale_amount: amount,
      cover_url: p.cover_url || null,
      photos: p.photos,
      occurred_at,
    };

    if (debt) {
      events.push({ ...common, sale_channel: 'debt_buy_now' });
    } else {
      events.push({ ...common, sale_channel: 'buy_now' });
    }
  }

  for (const p of ownerProps) {
    if (!isApprovedRow(p) || !isPrivateClubOnlyRow(p)) continue;
    const occurred_at = String(p.reviewed_at || p.updated_at || p.created_at || '').trim();
    if (!isFresh(occurred_at)) continue;
    events.push({
      event_id: `pc:${p.property_table}:${Number(p.id)}:${occurredMs(occurred_at)}`,
      sale_channel: 'vip_club_featured',
      property_id: p.id,
      property_type: p.property_type,
      property_table: p.property_table,
      source_table: p.source_table,
      title: p.title || '',
      location: p.location || '',
      currency: p.currency || 'USD',
      sale_amount: Number(p.price) || 0,
      cover_url: p.cover_url || null,
      photos: p.photos,
      occurred_at,
      vip_fee_amount: VIP_CLUB_PUBLICATION_FEE_MAJOR,
      vip_fee_currency: VIP_CLUB_PUBLICATION_FEE_CURRENCY,
    });
  }

  events.sort((a, b) => occurredMs(b.occurred_at) - occurredMs(a.occurred_at));
  return events;
}
