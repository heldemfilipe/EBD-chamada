import * as XLSX from 'xlsx'

/** Faz download de um arquivo pelo browser */
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Exporta array de objetos como CSV e inicia download */
export function exportarCSV(rows: Record<string, any>[], filename: string): void {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(';'),
    ...rows.map(row =>
      headers.map(h => {
        const v = row[h] ?? ''
        // Escapa valores com ponto-e-vírgula, aspas ou quebras de linha
        const s = String(v)
        return s.includes(';') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s
      }).join(';')
    ),
  ]
  const bom = '\uFEFF' // BOM para UTF-8 (Excel abre corretamente)
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  download(blob, filename)
}

/** Exporta múltiplas abas como .xlsx e inicia download */
export function exportarExcel(
  sheets: { nome: string; rows: Record<string, any>[] }[],
  filename: string
): void {
  const wb = XLSX.utils.book_new()
  for (const { nome, rows } of sheets) {
    if (!rows.length) continue
    const ws = XLSX.utils.json_to_sheet(rows)
    // Largura automática das colunas
    const cols = Object.keys(rows[0]).map(k => ({
      wch: Math.max(k.length, ...rows.map(r => String(r[k] ?? '').length)) + 2,
    }))
    ws['!cols'] = cols
    XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31))
  }
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  download(blob, filename)
}
