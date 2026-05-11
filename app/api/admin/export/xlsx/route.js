import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { getStaffFromRequest } from '@/lib/adminApiAuth'
import { parseExportTablePayload, safeExportBasename } from '@/lib/adminExportServerShared'

export const runtime = 'nodejs'

export async function POST(request) {
  const staff = await getStaffFromRequest(request)
  if (staff.error) {
    return NextResponse.json({ error: staff.error }, { status: staff.status })
  }
  if (!staff.permissions.peutExporterDonnees) {
    return NextResponse.json({ error: 'Export non autorisé' }, { status: 403 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const parsed = parseExportTablePayload(body)
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const sheetRaw = typeof body.sheetName === 'string' ? body.sheetName.trim() : ''
  const sheetName = (sheetRaw || 'Export').slice(0, 31)
  const filename = safeExportBasename(typeof body.filename === 'string' ? body.filename : 'export', '.xlsx')

  const wb = new ExcelJS.Workbook()
  wb.creator = 'ChezMoiCI admin'
  const ws = wb.addWorksheet(sheetName)
  ws.columns = parsed.columns.map((c) => ({
    header: c.label,
    key: c.key,
    width: Math.min(48, Math.max(10, c.label.length + 4)),
  }))
  for (const row of parsed.rows) {
    ws.addRow(row)
  }
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' },
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
