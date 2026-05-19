import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { getStaffFromRequest } from '@/lib/adminApiAuth'
import {
  parseExportTablePayload,
  parseExportSheetsPayload,
  safeExportBasename,
} from '@/lib/adminExportServerShared'
import { adminRateLimitKey, checkAdminRateLimit } from '@/lib/rateLimitAdmin'

export const runtime = 'nodejs'

export async function POST(request) {
  const staff = await getStaffFromRequest(request)
  if (staff.error) {
    return NextResponse.json({ error: staff.error }, { status: staff.status })
  }
  if (!staff.permissions.peutExporterDonnees) {
    return NextResponse.json({ error: 'Export non autorisé' }, { status: 403 })
  }

  const rl = checkAdminRateLimit(adminRateLimitKey(staff.user.id, 'export-xlsx'))
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Trop de requêtes. Réessayez dans ${rl.retryAfterSec}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const filename = safeExportBasename(typeof body.filename === 'string' ? body.filename : 'export', '.xlsx')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'ChezMoiCI admin'

  const multi = parseExportSheetsPayload(body)
  let tables = multi.sheets
  let errMsg = multi.error
  if (!tables) {
    const single = parseExportTablePayload(body)
    if (!single.error) {
      const sheetRaw = typeof body.sheetName === 'string' ? body.sheetName.trim() : ''
      tables = [{ sheetName: (sheetRaw || 'Export').slice(0, 31), columns: single.columns, rows: single.rows }]
    } else {
      errMsg = single.error
    }
  }

  if (!tables) {
    return NextResponse.json({ error: errMsg || 'Export invalide' }, { status: 400 })
  }

  for (const table of tables) {
    const ws = wb.addWorksheet(table.sheetName)
    ws.columns = table.columns.map((c) => ({
      header: c.label,
      key: c.key,
      width: Math.min(48, Math.max(10, c.label.length + 4)),
    }))
    for (const row of table.rows) {
      ws.addRow(row)
    }
    const headerRow = ws.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
