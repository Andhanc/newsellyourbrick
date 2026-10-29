/**
 * Export seller cabinet report to .xlsx (ExcelJS): logo, My sales, listings, summary.
 */

const BRAND_NAVY = '#1e3a5f'
/** Brand tiffany, same as UI (#0099a9) */
const BRAND_TIFFANY = '#0099a9'
/** Soft tiffany-tinted fill for totals */
const FILL_TIFFANY_SOFT = 'FFE8F1F4'

/** English fallbacks + i18n keys (used when `t` is passed). */
export const OWNER_EXCEL_LABELS = {
  logoSubtitle: { key: 'ownerExcel_logoSubtitle', en: 'Seller cabinet report' },
  sheetName: { key: 'ownerExcel_sheetName', en: 'Report' },
  mySales: { key: 'ownerExcel_mySales', en: 'My sales' },
  saleType: { key: 'ownerExcel_colSaleType', en: 'Deal type' },
  object: { key: 'ownerExcel_colObject', en: 'Property' },
  location: { key: 'ownerExcel_colLocation', en: 'Location' },
  amount: { key: 'ownerExcel_colAmount', en: 'Amount' },
  currency: { key: 'ownerExcel_colCurrency', en: 'Currency' },
  soldAt: { key: 'ownerExcel_colSoldAt', en: 'Sale date' },
  noSales: { key: 'ownerExcel_noSales', en: 'No sales' },
  salesTotalBanner: { key: 'ownerExcel_salesTotalBanner', en: 'Sales total' },
  sumAllSales: { key: 'ownerExcel_sumAllSales', en: 'Total sales amount' },
  listings: { key: 'ownerExcel_listings', en: 'Listings' },
  title: { key: 'ownerExcel_colTitle', en: 'Title' },
  price: { key: 'ownerExcel_colPrice', en: 'Price' },
  beds: { key: 'ownerExcel_colBeds', en: 'Bedrooms' },
  baths: { key: 'ownerExcel_colBaths', en: 'Bathrooms' },
  area: { key: 'ownerExcel_colArea', en: 'Area (m²)' },
  status: { key: 'ownerExcel_colStatus', en: 'Status' },
  likes: { key: 'ownerExcel_colLikes', en: 'Likes' },
  bids: { key: 'ownerExcel_colBids', en: 'Bids' },
  sharesSold: { key: 'ownerExcel_colSharesSold', en: 'Shares sold' },
  publishedAt: { key: 'ownerExcel_colPublishedAt', en: 'Published' },
  statusActive: { key: 'ownerExcel_statusActive', en: 'Active' },
  statusSold: { key: 'ownerExcel_statusSold', en: 'Sold' },
  statusRejected: { key: 'ownerExcel_statusRejected', en: 'Rejected' },
  statusPending: { key: 'ownerExcel_statusPending', en: 'Pending moderation' },
  statsTitle: { key: 'ownerExcel_statsTitle', en: 'Summary statistics' },
  statTotalListings: { key: 'ownerExcel_statTotalListings', en: 'Total listings' },
  statActiveListings: { key: 'ownerExcel_statActiveListings', en: 'Active listings' },
  statSoldListings: { key: 'ownerExcel_statSoldListings', en: 'Sold listings' },
  statTotalLikes: { key: 'ownerExcel_statTotalLikes', en: 'Total likes' },
  statTotalBids: { key: 'ownerExcel_statTotalBids', en: 'Total bids' },
  statSharesSold: { key: 'ownerExcel_statSharesSold', en: 'Shares sold (total)' },
  statInterestedUsers: { key: 'ownerExcel_statInterestedUsers', en: 'Interested users' },
  statRevenue: {
    key: 'ownerExcel_statRevenue',
    en: 'Total revenue (listings with status “Sold”)',
  },
  statAvgPrice: { key: 'ownerExcel_statAvgPrice', en: 'Average price' },
  statConvLikesBids: {
    key: 'ownerExcel_statConvLikesBids',
    en: 'Conversion likes → bids (%)',
  },
  statInterestPerListing: {
    key: 'ownerExcel_statInterestPerListing',
    en: 'Interest per listing',
  },
  saleTypeAuction: { key: 'ownerExcel_saleTypeAuction', en: 'Auction' },
  saleTypeShares: { key: 'ownerExcel_saleTypeShares', en: 'Shares' },
  saleTypeDebts: { key: 'ownerExcel_saleTypeDebts', en: 'Debts' },
  saleTypeBuyNow: { key: 'ownerExcel_saleTypeBuyNow', en: 'Buy now' },
  emDash: { key: 'ownerExcel_emDash', en: '—' },
}

function label(t, entry) {
  if (typeof t === 'function') {
    const translated = t(entry.key)
    if (translated && translated !== entry.key) return translated
  }
  return entry.en
}

function thinBorder() {
  return {
    top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
  }
}

/**
 * PNG with SellYouBrick logo (tiffany + navy).
 * @param {((key: string) => string) | undefined} t
 */
export function buildSellYourBrickLogoPng(t) {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('no_document'))
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = 360
    canvas.height = 72
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('no_canvas'))
      return
    }
    ctx.fillStyle = BRAND_NAVY
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = BRAND_TIFFANY
    ctx.fillRect(0, 0, 10, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px system-ui, "Segoe UI", sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText('SellYouBrick', 28, canvas.height / 2 - 8)
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    ctx.font = '13px system-ui, "Segoe UI", sans-serif'
    ctx.fillText(label(t, OWNER_EXCEL_LABELS.logoSubtitle), 28, canvas.height / 2 + 16)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('no_blob'))
          return
        }
        const reader = new FileReader()
        reader.onload = () => resolve(new Uint8Array(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(blob)
      },
      'image/png',
      1
    )
  })
}

function collectSalesRows(data, t) {
  if (!data) return []
  const saleTypeLabels = {
    auction: label(t, OWNER_EXCEL_LABELS.saleTypeAuction),
    shares: label(t, OWNER_EXCEL_LABELS.saleTypeShares),
    debts: label(t, OWNER_EXCEL_LABELS.saleTypeDebts),
    buy_now: label(t, OWNER_EXCEL_LABELS.saleTypeBuyNow),
  }
  const out = []
  for (const key of ['auction', 'shares', 'debts', 'buy_now']) {
    const arr = Array.isArray(data[key]) ? data[key] : []
    for (const item of arr) {
      out.push({
        ...item,
        _saleType: key,
        _saleTypeLabel: saleTypeLabels[key] || key,
      })
    }
  }
  out.sort((a, b) => {
    const ta = a.sold_at ? new Date(a.sold_at).getTime() : NaN
    const tb = b.sold_at ? new Date(b.sold_at).getTime() : NaN
    const na = Number.isFinite(ta) ? ta : -1
    const nb = Number.isFinite(tb) ? tb : -1
    return nb - na
  })
  return out
}

function applyHeaderRow(row, cols) {
  cols.forEach((text, i) => {
    const c = row.getCell(i + 1)
    c.value = text
    c.font = { bold: true }
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8EEF0' },
    }
    c.border = thinBorder()
  })
}

/**
 * @param {object} params
 * @param {(v: unknown) => string} params.formatDateSafe
 * @param {object[]} params.properties
 * @param {object} params.stats — counters and summary
 * @param {object | null} params.mySalesData — { auction, shares, debts, buy_now }
 * @param {((key: string) => string) | undefined} [params.t] — i18n; without it English headers are used
 */
export async function exportOwnerAnalyticsExcel({
  formatDateSafe,
  properties,
  stats,
  mySalesData,
  t,
}) {
  const L = OWNER_EXCEL_LABELS
  const dash = label(t, L.emDash)
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SellYouBrick'
  const ws = wb.addWorksheet(label(t, L.sheetName), {
    views: [{ showGridLines: true }],
  })

  ws.columns = [
    { width: 20 },
    { width: 36 },
    { width: 36 },
    { width: 16 },
    { width: 10 },
    { width: 18 },
  ]

  let nextRow = 1

  try {
    const logoBuffer = await buildSellYourBrickLogoPng(t)
    const imageId = wb.addImage({ buffer: logoBuffer, extension: 'png' })
    ws.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 360, height: 72 },
    })
  } catch (e) {
    console.warn('ownerAnalyticsExcelExport: logo', e)
  }

  ws.getRow(1).height = 54
  ws.getRow(2).height = 6
  ws.getRow(3).height = 6
  nextRow = 4

  const salesRows = collectSalesRows(mySalesData, t)

  ws.mergeCells(`A${nextRow}:F${nextRow}`)
  const secSales = ws.getRow(nextRow)
  secSales.getCell(1).value = label(t, L.mySales)
  secSales.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1e3a5f' } }
  secSales.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0F4F8' },
  }
  secSales.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  secSales.height = 26
  nextRow++

  const salesHeaders = [
    label(t, L.saleType),
    label(t, L.object),
    label(t, L.location),
    label(t, L.amount),
    label(t, L.currency),
    label(t, L.soldAt),
  ]
  applyHeaderRow(ws.getRow(nextRow), salesHeaders)
  nextRow++

  if (salesRows.length === 0) {
    ws.mergeCells(`A${nextRow}:F${nextRow}`)
    const empty = ws.getRow(nextRow)
    empty.getCell(1).value = label(t, L.noSales)
    empty.getCell(1).alignment = { horizontal: 'center' }
    nextRow++
  } else {
    for (const s of salesRows) {
      const r = ws.getRow(nextRow)
      const amount = Number(s.sale_amount)
      const vals = [
        s._saleTypeLabel,
        s.title || dash,
        s.location || dash,
        Number.isFinite(amount) ? amount : null,
        (s.currency || 'USD').toUpperCase(),
        s.sold_at ? formatDateSafe(s.sold_at) : dash,
      ]
      vals.forEach((v, i) => {
        const c = r.getCell(i + 1)
        c.value = v
        c.border = thinBorder()
        if (i === 3 && typeof v === 'number') {
          c.numFmt = '#,##0.00'
        }
      })
      nextRow++
    }
  }

  const totalsByCurrency = new Map()
  for (const s of salesRows) {
    const cur = (s.currency || 'USD').toUpperCase()
    const amt = Number(s.sale_amount) || 0
    totalsByCurrency.set(cur, (totalsByCurrency.get(cur) || 0) + amt)
  }

  nextRow++
  ws.mergeCells(`A${nextRow}:F${nextRow}`)
  const totalBanner = ws.getRow(nextRow)
  totalBanner.getCell(1).value = label(t, L.salesTotalBanner)
  totalBanner.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
  totalBanner.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4A90A2' },
  }
  totalBanner.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }
  totalBanner.height = 24
  nextRow++

  if (totalsByCurrency.size === 0) {
    ws.mergeCells(`A${nextRow}:F${nextRow}`)
    ws.getRow(nextRow).getCell(1).value = dash
    nextRow++
  } else {
    const sortedCur = [...totalsByCurrency.keys()].sort()
    for (const cur of sortedCur) {
      const sum = totalsByCurrency.get(cur) || 0
      const tr = ws.getRow(nextRow)
      ws.mergeCells(`A${nextRow}:D${nextRow}`)
      tr.getCell(1).value = label(t, L.sumAllSales)
      tr.getCell(1).font = { bold: true }
      tr.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: FILL_TIFFANY_SOFT },
      }
      tr.getCell(5).value = cur
      tr.getCell(5).font = { bold: true }
      tr.getCell(5).alignment = { horizontal: 'center' }
      tr.getCell(5).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: FILL_TIFFANY_SOFT },
      }
      tr.getCell(6).value = sum
      tr.getCell(6).numFmt = '#,##0.00'
      tr.getCell(6).font = { bold: true, size: 12, color: { argb: 'FF0f172a' } }
      tr.getCell(6).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: FILL_TIFFANY_SOFT },
      }
      tr.getCell(6).border = thinBorder()
      tr.height = 22
      nextRow++
    }
  }

  nextRow++
  ws.mergeCells(`A${nextRow}:K${nextRow}`)
  const secProps = ws.getRow(nextRow)
  secProps.getCell(1).value = label(t, L.listings)
  secProps.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1e3a5f' } }
  secProps.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0F4F8' },
  }
  secProps.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  secProps.height = 26
  nextRow++

  const propHeaders = [
    label(t, L.title),
    label(t, L.location),
    label(t, L.price),
    label(t, L.beds),
    label(t, L.baths),
    label(t, L.area),
    label(t, L.status),
    label(t, L.likes),
    label(t, L.bids),
    label(t, L.sharesSold),
    label(t, L.publishedAt),
  ]
  // Widen columns for the listings block (A–K)
  ws.getColumn(1).width = Math.max(ws.getColumn(1).width || 0, 22)
  ws.getColumn(2).width = Math.max(ws.getColumn(2).width || 0, 28)
  for (let c = 3; c <= 11; c++) {
    if (!ws.getColumn(c).width) ws.getColumn(c).width = c === 7 ? 14 : c >= 8 && c <= 10 ? 12 : 14
  }

  const hr = ws.getRow(nextRow)
  propHeaders.forEach((text, i) => {
    const cell = hr.getCell(i + 1)
    cell.value = text
    cell.font = { bold: true }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8EEF0' },
    }
    cell.border = thinBorder()
  })
  nextRow++

  for (const property of properties) {
    const statusText =
      property.status === 'active'
        ? label(t, L.statusActive)
        : property.status === 'sold'
          ? label(t, L.statusSold)
          : property.status === 'rejected'
            ? label(t, L.statusRejected)
            : label(t, L.statusPending)
    const r = ws.getRow(nextRow)
    const cells = [
      property.title,
      property.location,
      Number(property.price) || 0,
      property.beds,
      property.baths,
      property.sqft,
      statusText,
      property.likesCount ?? 0,
      property.bidsCount ?? 0,
      Number(property.shares_sold) || 0,
      formatDateSafe(property.publishedDate),
    ]
    cells.forEach((v, i) => {
      const c = r.getCell(i + 1)
      c.value = v
      c.border = thinBorder()
      if (i === 2) c.numFmt = '#,##0'
    })
    nextRow++
  }

  nextRow++
  ws.mergeCells(`A${nextRow}:B${nextRow}`)
  const statTitle = ws.getRow(nextRow)
  statTitle.getCell(1).value = label(t, L.statsTitle)
  statTitle.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF1e3a5f' } }
  statTitle.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8EEF0' },
  }
  nextRow++

  const revenueLabel = label(t, L.statRevenue)
  const avgPriceLabel = label(t, L.statAvgPrice)
  const statRows = [
    [label(t, L.statTotalListings), stats.totalProperties],
    [label(t, L.statActiveListings), stats.activeProperties],
    [label(t, L.statSoldListings), stats.soldProperties],
    [label(t, L.statTotalLikes), stats.totalLikes],
    [label(t, L.statTotalBids), stats.totalBids],
    [label(t, L.statSharesSold), stats.totalSharesSoldAgg],
    [label(t, L.statInterestedUsers), stats.interestCount],
    [
      revenueLabel,
      properties.filter((p) => p.status === 'sold').reduce((sum, p) => sum + (Number(p.price) || 0), 0),
    ],
    [
      avgPriceLabel,
      stats.totalProperties > 0
        ? Math.round(
            properties.reduce((sum, p) => sum + (Number(p.price) || 0), 0) / stats.totalProperties
          )
        : 0,
    ],
    [label(t, L.statConvLikesBids), `${stats.convLikesToBidsPct}%`],
    [label(t, L.statInterestPerListing), stats.interestPerListing],
  ]

  for (const [rowLabel, val] of statRows) {
    const row = ws.getRow(nextRow)
    row.getCell(1).value = rowLabel
    row.getCell(1).border = thinBorder()
    row.getCell(2).value = val
    row.getCell(2).border = thinBorder()
    if (typeof val === 'number' && rowLabel === revenueLabel) {
      row.getCell(2).numFmt = '#,##0'
    }
    if (typeof val === 'number' && rowLabel === avgPriceLabel) {
      row.getCell(2).numFmt = '#,##0'
    }
    nextRow++
  }

  const buf = await wb.xlsx.writeBuffer()
  return buf
}

export function downloadXlsxBuffer(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
