/**
 * Экспорт отчёта кабинета продавца в .xlsx (ExcelJS): логотип, блок «Мои продажи», объявления, сводка.
 */

const BRAND_NAVY = '#1e3a5f'
/** Фирменный тиффани, как в UI (#4a90a2) */
const BRAND_TIFFANY = '#4a90a2'
/** Светлый фон под итоги (в тон тиффани) */
const FILL_TIFFANY_SOFT = 'FFE8F1F4'

const SALE_TYPE_LABELS = {
  auction: 'Аукцион',
  shares: 'Доли',
  debts: 'Долги',
  buy_now: 'Купить сейчас',
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
 * PNG с «логотипом» SellYouBrick (тиффани + тёмно-синий).
 */
export function buildSellYourBrickLogoPng() {
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
    ctx.fillText('Отчёт кабинета продавца', 28, canvas.height / 2 + 16)

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

function collectSalesRows(data) {
  if (!data) return []
  const out = []
  for (const key of ['auction', 'shares', 'debts', 'buy_now']) {
    const arr = Array.isArray(data[key]) ? data[key] : []
    for (const item of arr) {
      out.push({
        ...item,
        _saleType: key,
        _saleTypeLabel: SALE_TYPE_LABELS[key] || key,
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
 * @param {object} params.stats — счётчики и сводка
 * @param {object | null} params.mySalesData — { auction, shares, debts, buy_now }
 */
export async function exportOwnerAnalyticsExcel({
  formatDateSafe,
  properties,
  stats,
  mySalesData,
}) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SellYouBrick'
  const ws = wb.addWorksheet('Отчёт', {
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
    const logoBuffer = await buildSellYourBrickLogoPng()
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

  const salesRows = collectSalesRows(mySalesData)

  ws.mergeCells(`A${nextRow}:F${nextRow}`)
  const secSales = ws.getRow(nextRow)
  secSales.getCell(1).value = 'Мои продажи'
  secSales.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1e3a5f' } }
  secSales.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0F4F8' },
  }
  secSales.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  secSales.height = 26
  nextRow++

  const salesHeaders = ['Тип сделки', 'Объект', 'Локация', 'Сумма', 'Валюта', 'Дата продажи']
  applyHeaderRow(ws.getRow(nextRow), salesHeaders)
  nextRow++

  if (salesRows.length === 0) {
    ws.mergeCells(`A${nextRow}:F${nextRow}`)
    const empty = ws.getRow(nextRow)
    empty.getCell(1).value = 'Нет продаж'
    empty.getCell(1).alignment = { horizontal: 'center' }
    nextRow++
  } else {
    for (const s of salesRows) {
      const r = ws.getRow(nextRow)
      const amount = Number(s.sale_amount)
      const vals = [
        s._saleTypeLabel,
        s.title || '—',
        s.location || '—',
        Number.isFinite(amount) ? amount : null,
        (s.currency || 'USD').toUpperCase(),
        s.sold_at ? formatDateSafe(s.sold_at) : '—',
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
  totalBanner.getCell(1).value = 'Итого по продажам'
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
    ws.getRow(nextRow).getCell(1).value = '—'
    nextRow++
  } else {
    const sortedCur = [...totalsByCurrency.keys()].sort()
    for (const cur of sortedCur) {
      const sum = totalsByCurrency.get(cur) || 0
      const tr = ws.getRow(nextRow)
      ws.mergeCells(`A${nextRow}:D${nextRow}`)
      tr.getCell(1).value = 'Сумма всех продаж'
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
  secProps.getCell(1).value = 'Объявления'
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
    'Название',
    'Локация',
    'Цена',
    'Спальни',
    'Ванные',
    'Площадь (м²)',
    'Статус',
    'Лайки',
    'Ставки',
    'Куплено долей',
    'Дата публикации',
  ]
  // Расширяем колонки для блока объявлений (A–K)
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
        ? 'Активно'
        : property.status === 'sold'
          ? 'Продано'
          : property.status === 'rejected'
            ? 'Отклонено'
            : 'На модерации'
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
  statTitle.getCell(1).value = 'Итоговая статистика'
  statTitle.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF1e3a5f' } }
  statTitle.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8EEF0' },
  }
  nextRow++

  const statRows = [
    ['Всего объявлений', stats.totalProperties],
    ['Активных объявлений', stats.activeProperties],
    ['Продано объявлений', stats.soldProperties],
    ['Всего лайков', stats.totalLikes],
    ['Всего ставок', stats.totalBids],
    ['Куплено долей (всего)', stats.totalSharesSoldAgg],
    ['Заинтересованных пользователей', stats.interestCount],
    [
      'Общая выручка (объявления со статусом «Продано»)',
      properties.filter((p) => p.status === 'sold').reduce((sum, p) => sum + (Number(p.price) || 0), 0),
    ],
    [
      'Средняя цена',
      stats.totalProperties > 0
        ? Math.round(
            properties.reduce((sum, p) => sum + (Number(p.price) || 0), 0) / stats.totalProperties
          )
        : 0,
    ],
    ['Конверсия лайки → ставки (%)', `${stats.convLikesToBidsPct}%`],
    ['Интерес на объявление', stats.interestPerListing],
  ]

  for (const [label, val] of statRows) {
    const row = ws.getRow(nextRow)
    row.getCell(1).value = label
    row.getCell(1).border = thinBorder()
    row.getCell(2).value = val
    row.getCell(2).border = thinBorder()
    if (typeof val === 'number' && label.includes('выручка')) {
      row.getCell(2).numFmt = '#,##0'
    }
    if (typeof val === 'number' && label.includes('Средняя')) {
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
