import ExcelJS from "exceljs"
import { parseEnrollmentCsv } from "./enrollment-sync"
import type { Student } from "./types"

export async function parseEnrollmentFile(filename: string, bytes: Buffer | Uint8Array): Promise<Partial<Student>[]> {
  const name = filename.toLowerCase()
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    return parseEnrollmentCsv(buffer.toString("utf8"))
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const workbook = new ExcelJS.Workbook()
    // exceljs can read xlsx; older .xls may fail — fall through to CSV-looking text
    try {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
    } catch {
      return parseEnrollmentCsv(buffer.toString("utf8"))
    }
    const sheet = workbook.worksheets[0]
    if (!sheet) return []
    const rows: string[][] = []
    sheet.eachRow((row) => {
      rows.push(
        row.values
          ? (row.values as unknown[]).slice(1).map((cell) => {
              if (cell == null) return ""
              if (typeof cell === "object" && cell && "text" in cell) return String((cell as { text?: string }).text || "")
              if (cell instanceof Date) return cell.toISOString().slice(0, 10)
              return String(cell)
            })
          : [],
      )
    })
    if (rows.length < 2) return []
    const csv = rows
      .map((cols) => cols.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    return parseEnrollmentCsv(csv)
  }
  return parseEnrollmentCsv(buffer.toString("utf8"))
}
