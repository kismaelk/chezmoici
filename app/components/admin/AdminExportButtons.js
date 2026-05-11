'use client'

import { telechargerCsv } from '@/lib/adminCsv'
import { telechargerExportPdfAdmin, telechargerExportXlsxAdmin } from '@/lib/adminExportClient'

const btnCsv =
  'text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50'
const btnXlsx =
  'text-xs font-bold px-2 py-1.5 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50'
const btnPdf =
  'text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50'

/**
 * Export CSV (client), Excel (.xlsx) et PDF générés côté serveur (session staff).
 */
export default function AdminExportButtons({
  wrapperClassName,
  label,
  fichierBase,
  sheetName,
  titrePdf,
  columns,
  rows,
  showToast,
}) {
  return (
    <div className={wrapperClassName}>
      {label ? (
        <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
      ) : null}
      <button
        type="button"
        onClick={() => telechargerCsv(fichierBase, columns, rows)}
        className={btnCsv}
      >
        CSV
      </button>
      <button
        type="button"
        onClick={() =>
          void telechargerExportXlsxAdmin({
            filename: fichierBase,
            sheetName: sheetName || titrePdf,
            columns,
            rows,
            showToast,
          })
        }
        className={btnXlsx}
      >
        Excel (.xlsx)
      </button>
      <button
        type="button"
        onClick={() =>
          void telechargerExportPdfAdmin({
            title: titrePdf,
            filename: fichierBase,
            columns,
            rows,
            showToast,
          })
        }
        className={btnPdf}
      >
        PDF
      </button>
    </div>
  )
}
