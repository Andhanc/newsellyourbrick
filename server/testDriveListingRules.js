/**
 * Тест-драйв разрешён только для аукциона с заявленной ценой «Продать сейчас»
 * выше стартовой ставки (или при нулевом/отсутствующем старте — при положительной цене buy now).
 * Не применяется к долям и долговым лотам.
 */
export function propertyRowAllowsTestDriveListing(p) {
  if (!p) return false;
  const st = String(p.sale_type || '').toLowerCase();
  if (st === 'debt' || st === 'share') return false;
  if (p.is_debt === 1 || p.is_debt === true || p.has_debt === 1 || p.has_debt === true) return false;
  if (p.is_shared_ownership === 1 || p.is_shared_ownership === true) return false;

  const isAuction =
    p.is_auction === 1 ||
    p.is_auction === true ||
    p.is_auction === '1' ||
    p.isAuction === true;
  if (!isAuction) return false;

  const buyNow = p.price != null && p.price !== '' ? Number(p.price) : 0;
  if (!(buyNow > 0) || Number.isNaN(buyNow)) return false;

  const startRaw = p.auction_starting_price;
  const start =
    startRaw != null && startRaw !== '' && !Number.isNaN(Number(startRaw)) ? Number(startRaw) : 0;

  if (start > 0 && buyNow > start) return true;
  if (!(start > 0) && buyNow > 0) return true;
  return false;
}
