import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MAX_EXPORT_ROWS,
  parseExportSheetsPayload,
} from '../lib/adminExportServerShared.js'

const column = { key: 'id', label: 'ID' }

function rows(count) {
  return Array.from({ length: count }, (_, id) => ({ id }))
}

test('parseExportSheetsPayload accepts multiple sheets within the total row budget', () => {
  const result = parseExportSheetsPayload({
    sheets: [
      { sheetName: 'A', columns: [column], rows: rows(MAX_EXPORT_ROWS / 2) },
      { sheetName: 'B', columns: [column], rows: rows(MAX_EXPORT_ROWS / 2) },
    ],
  })

  assert.equal(result.error, undefined)
  assert.equal(result.sheets.length, 2)
  assert.equal(
    result.sheets.reduce((total, sheet) => total + sheet.rows.length, 0),
    MAX_EXPORT_ROWS
  )
})

test('parseExportSheetsPayload rejects aggregate rows above the server budget', () => {
  const result = parseExportSheetsPayload({
    sheets: [
      { sheetName: 'A', columns: [column], rows: rows(MAX_EXPORT_ROWS) },
      { sheetName: 'B', columns: [column], rows: rows(1) },
    ],
  })

  assert.match(result.error, new RegExp(`Plafond ${MAX_EXPORT_ROWS} lignes au total`))
  assert.equal(result.sheets, undefined)
})
