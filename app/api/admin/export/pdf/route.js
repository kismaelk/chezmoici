import PDFDocument from 'pdfkit'
import { NextResponse } from 'next/server'
import { getStaffFromRequest } from '@/lib/adminApiAuth'
import { parseExportTablePayload, safeExportBasename } from '@/lib/adminExportServerShared'
import { adminRateLimitKey, checkAdminRateLimit } from '@/lib/rateLimitAdmin'

export const runtime = 'nodejs'

function cellText(v) {
  if (v == null) return ''
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return s.replace(/\|/g, '/').replace(/\s+/g, ' ').trim().slice(0, 500)
}

export async function POST(request) {
  const staff = await getStaffFromRequest(request)
  if (staff.error) {
    return NextResponse.json({ error: staff.error }, { status: staff.status })
  }
  if (!staff.permissions.peutExporterDonnees) {
    return NextResponse.json({ error: 'Export non autorisé' }, { status: 403 })
  }

  const rl = checkAdminRateLimit(adminRateLimitKey(staff.user.id, 'export-pdf'))
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

  const parsed = parseExportTablePayload(body)
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : 'Export'
  const filename = safeExportBasename(
    typeof body.filename === 'string' && body.filename.trim()
      ? body.filename.trim()
      : title,
    '.pdf'
  )

  const layout = parsed.columns.length > 7 ? 'landscape' : 'portrait'
  const chunks = []
  const doc = new PDFDocument({
    margin: 40,
    size: 'A4',
    layout,
    info: { Title: title, Author: 'ChezMoiCI admin' },
  })
  doc.on('data', (c) => chunks.push(c))

  doc.font('Helvetica').fontSize(12).fillColor('#0f172a').text(title, { underline: true })
  doc.moveDown(0.6)
  doc.fontSize(7.5).fillColor('#334155')
  const headerLine = parsed.columns.map((c) => cellText(c.label)).join('  |  ')
  doc.text(headerLine, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right })
  doc.moveDown(0.15)
  doc.strokeColor('#94a3b8')
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke()
  doc.moveDown(0.35)
  doc.font('Helvetica').fontSize(7).fillColor('#1e293b')

  const bottom = () => doc.page.height - doc.page.margins.bottom
  for (const row of parsed.rows) {
    if (doc.y > bottom() - 24) {
      doc.addPage()
      doc.fontSize(7).fillColor('#1e293b')
    }
    const line = parsed.columns.map((c) => cellText(row[c.key])).join('  |  ')
    doc.text(line, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      paragraphGap: 2,
    })
  }

  doc.end()
  await new Promise((resolve, reject) => {
    doc.on('end', resolve)
    doc.on('error', reject)
  })

  const buffer = Buffer.concat(chunks)
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
