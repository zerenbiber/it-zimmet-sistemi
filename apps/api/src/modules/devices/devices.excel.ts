import ExcelJS from "exceljs";
import { z } from "zod";
import { DeviceEventType, DeviceType } from "../../generated/prisma/enums.js";
import { badRequest, HttpError } from "../../lib/http-error.js";
import { DEVICE_STATUS_LABELS, DEVICE_TYPE_LABELS } from "../../lib/labels.js";
import { prisma } from "../../lib/prisma.js";
import { createDeviceSchema, type ListDevicesQuery } from "./devices.schemas.js";
import { buildDeviceWhere, nextAssetTag } from "./devices.service.js";

const EXPORT_ROW_LIMIT = 10_000;
const IMPORT_ROW_LIMIT = 1_000;
const DATE_FORMAT = "dd.mm.yyyy";

const HEADER_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: "FFFFFFFF" } },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF2A78D6" } },
  alignment: { vertical: "middle" },
};

function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1);
  header.eachCell((cell) => Object.assign(cell, { style: HEADER_STYLE }));
  header.height = 22;
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

async function toBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// ─── Dışa aktarma ─────────────────────────────────────────────────────────────

export async function exportDevices(query: Omit<ListDevicesQuery, "page" | "pageSize">): Promise<Buffer> {
  const devices = await prisma.device.findMany({
    where: buildDeviceWhere(query),
    orderBy: { assetTag: "asc" },
    take: EXPORT_ROW_LIMIT,
    select: {
      assetTag: true,
      type: true,
      brand: true,
      model: true,
      serialNumber: true,
      status: true,
      purchaseDate: true,
      warrantyEndDate: true,
      notes: true,
      assignments: {
        where: { returnedAt: null },
        select: {
          assignedAt: true,
          user: { select: { firstName: true, lastName: true, department: { select: { name: true } } } },
        },
      },
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Cihazlar");
  sheet.columns = [
    { header: "Demirbaş No", key: "assetTag", width: 16 },
    { header: "Tür", key: "type", width: 20 },
    { header: "Marka", key: "brand", width: 16 },
    { header: "Model", key: "model", width: 22 },
    { header: "Seri No", key: "serialNumber", width: 20 },
    { header: "Durum", key: "status", width: 16 },
    { header: "Alış Tarihi", key: "purchaseDate", width: 13, style: { numFmt: DATE_FORMAT } },
    { header: "Garanti Bitiş", key: "warrantyEndDate", width: 13, style: { numFmt: DATE_FORMAT } },
    { header: "Zimmetli Personel", key: "assignee", width: 22 },
    { header: "Departman", key: "department", width: 20 },
    { header: "Zimmet Tarihi", key: "assignedAt", width: 13, style: { numFmt: DATE_FORMAT } },
    { header: "Notlar", key: "notes", width: 40 },
  ];

  for (const device of devices) {
    const assignment = device.assignments[0];
    sheet.addRow({
      ...device,
      type: DEVICE_TYPE_LABELS[device.type],
      status: DEVICE_STATUS_LABELS[device.status],
      assignee: assignment ? `${assignment.user.firstName} ${assignment.user.lastName}` : null,
      department: assignment?.user.department?.name ?? null,
      assignedAt: assignment?.assignedAt ?? null,
    });
  }

  styleHeader(sheet);
  sheet.autoFilter = { from: "A1", to: { row: 1, column: sheet.columnCount } };
  return toBuffer(workbook);
}

// ─── İçe aktarma şablonu ──────────────────────────────────────────────────────

const IMPORT_COLUMNS = [
  { header: "Tür", key: "type", width: 22, required: true },
  { header: "Marka", key: "brand", width: 18, required: true },
  { header: "Model", key: "model", width: 24, required: true },
  { header: "Seri No", key: "serialNumber", width: 22, required: true },
  { header: "Alış Tarihi", key: "purchaseDate", width: 14, required: true },
  { header: "Garanti Bitiş", key: "warrantyEndDate", width: 14, required: false },
  { header: "Notlar", key: "notes", width: 40, required: false },
] as const;

type ImportKey = (typeof IMPORT_COLUMNS)[number]["key"];

export async function buildImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Cihazlar");
  sheet.columns = IMPORT_COLUMNS.map(({ header, key, width }) => ({ header, key, width }));
  styleHeader(sheet);

  // Cihaz türleri gizli bir sayfadan beslenen açılır listeden seçilir.
  const lists = workbook.addWorksheet("Listeler", { state: "veryHidden" });
  const typeLabels = Object.values(DEVICE_TYPE_LABELS);
  typeLabels.forEach((label, index) => (lists.getCell(index + 1, 1).value = label));

  for (let row = 2; row <= IMPORT_ROW_LIMIT + 1; row++) {
    sheet.getCell(row, 1).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`Listeler!$A$1:$A$${typeLabels.length}`],
      showErrorMessage: true,
      errorTitle: "Geçersiz tür",
      error: "Listeden bir cihaz türü seçin.",
    };
    sheet.getCell(row, 5).numFmt = DATE_FORMAT;
    sheet.getCell(row, 6).numFmt = DATE_FORMAT;
  }

  const help = workbook.addWorksheet("Açıklama");
  help.columns = [
    { header: "Sütun", key: "column", width: 18 },
    { header: "Zorunlu", key: "required", width: 10 },
    { header: "Açıklama", key: "description", width: 70 },
  ];
  const descriptions: Record<ImportKey, string> = {
    type: `Listeden seçin: ${typeLabels.join(", ")}`,
    brand: "Ör. Lenovo",
    model: "Ör. ThinkPad T14",
    serialNumber: "Üreticinin seri numarası. Sistemde ve dosyada tekil olmalı.",
    purchaseDate: "GG.AA.YYYY biçiminde tarih, ör. 15.03.2025",
    warrantyEndDate: "GG.AA.YYYY biçiminde tarih; bilinmiyorsa boş bırakın.",
    notes: "İsteğe bağlı açıklama",
  };
  for (const column of IMPORT_COLUMNS) {
    help.addRow({ column: column.header, required: column.required ? "Evet" : "Hayır", description: descriptions[column.key] });
  }
  help.addRow({});
  help.addRow({ column: "Not", description: "Demirbaş numaraları içe aktarma sırasında otomatik verilir. Cihazlar 'Stokta' durumunda eklenir." });
  styleHeader(help);

  return toBuffer(workbook);
}

// ─── İçe aktarma ──────────────────────────────────────────────────────────────

export interface ImportRowError {
  row: number;
  messages: string[];
}

const normalize = (value: string) => value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");

const TYPE_BY_NAME = new Map<string, DeviceType>(
  Object.entries(DEVICE_TYPE_LABELS).flatMap(([code, label]) => [
    [normalize(label), code as DeviceType],
    [normalize(code), code as DeviceType],
  ]),
);

/** ExcelJS hücre değerinin alabileceği farklı biçimleri düz metne ya da Date'e çevirir. */
function cellValue(cell: ExcelJS.Cell): string | Date | number | null {
  const value = cell.value;
  if (value === null || value === undefined) return null;
  if (value instanceof Date || typeof value === "number") return value;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "boolean") return String(value);
  if ("richText" in value) return value.richText.map((part) => part.text).join("").trim() || null;
  if ("result" in value) {
    const result = value.result;
    return result instanceof Date || typeof result === "number" || typeof result === "string" ? result : null;
  }
  if ("text" in value) return String(value.text).trim() || null;
  return null;
}

/** YYYY-MM-DD döner; 32.13.2025 gibi geçersiz tarihlerde undefined. */
function calendarDate(year: number, month: number, day: number): string | undefined {
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? date.toISOString().slice(0, 10) : undefined;
}

/** Excel tarihlerini, Excel seri numaralarını, "GG.AA.YYYY" ve "YYYY-AA-GG" biçimlerini kabul eder. */
function toIsoDate(value: string | Date | number | null): string | null | undefined {
  if (value === null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    // Excel seri tarihi: 1899-12-30'dan bu yana geçen gün sayısı.
    return new Date(Math.round((value - 25569) * 86_400_000)).toISOString().slice(0, 10);
  }
  const turkish = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(value);
  if (turkish) {
    return calendarDate(Number(turkish[3]), Number(turkish[2]), Number(turkish[1]));
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return iso ? calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3])) : undefined;
}

export async function importDevices(file: Buffer, actorId: string) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(file as unknown as ArrayBuffer);
  } catch {
    throw badRequest("Dosya okunamadı. Lütfen .xlsx biçiminde bir Excel dosyası yükleyin.", "INVALID_FILE");
  }

  const sheet = workbook.worksheets.find((candidate) => candidate.state === "visible") ?? workbook.worksheets[0];
  if (!sheet) {
    throw badRequest("Dosyada çalışma sayfası bulunamadı.", "INVALID_FILE");
  }

  // Sütunlar başlık adına göre bulunur, dosyadaki sırası önemli değil.
  const columnIndex = new Map<ImportKey, number>();
  sheet.getRow(1).eachCell((cell, column) => {
    const header = normalize(String(cellValue(cell) ?? "").replace("*", ""));
    const match = IMPORT_COLUMNS.find((candidate) => normalize(candidate.header) === header);
    if (match) columnIndex.set(match.key, column);
  });
  const missing = IMPORT_COLUMNS.filter((column) => column.required && !columnIndex.has(column.key));
  if (missing.length > 0) {
    throw badRequest(
      `Şu sütunlar bulunamadı: ${missing.map((column) => column.header).join(", ")}. Lütfen içe aktarma şablonunu kullanın.`,
      "INVALID_TEMPLATE",
    );
  }

  const rows: { row: number; data: z.infer<typeof createDeviceSchema> }[] = [];
  const errors: ImportRowError[] = [];
  const serialRows = new Map<string, number>();

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const read = (key: ImportKey) => {
      const column = columnIndex.get(key);
      return column ? cellValue(row.getCell(column)) : null;
    };
    const raw = Object.fromEntries(IMPORT_COLUMNS.map((column) => [column.key, read(column.key)])) as Record<
      ImportKey,
      ReturnType<typeof cellValue>
    >;

    if (Object.values(raw).every((value) => value === null)) continue;
    if (rows.length + errors.length >= IMPORT_ROW_LIMIT) {
      throw badRequest(`Bir seferde en fazla ${IMPORT_ROW_LIMIT} cihaz içe aktarılabilir.`, "TOO_MANY_ROWS");
    }

    const messages: string[] = [];
    const typeText = raw.type === null ? "" : String(raw.type);
    const type = TYPE_BY_NAME.get(normalize(typeText));
    if (!type) messages.push(typeText ? `Bilinmeyen cihaz türü: "${typeText}".` : "Tür boş olamaz.");

    const purchaseDate = toIsoDate(raw.purchaseDate);
    const warrantyEndDate = toIsoDate(raw.warrantyEndDate);
    if (purchaseDate === undefined) messages.push("Alış tarihi GG.AA.YYYY biçiminde olmalı.");
    if (warrantyEndDate === undefined) messages.push("Garanti bitiş tarihi GG.AA.YYYY biçiminde olmalı.");

    const text = (value: ReturnType<typeof cellValue>) =>
      value instanceof Date ? value.toISOString().slice(0, 10) : value === null ? "" : String(value);

    const parsed = createDeviceSchema.safeParse({
      type: type ?? DeviceType.OTHER,
      brand: text(raw.brand),
      model: text(raw.model),
      serialNumber: text(raw.serialNumber),
      purchaseDate: purchaseDate ?? "",
      warrantyEndDate: warrantyEndDate ?? null,
      notes: text(raw.notes),
    });

    if (!parsed.success) {
      // Tarih hataları yukarıda daha anlaşılır şekilde zaten bildirildi.
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]);
        if (field === "purchaseDate" && purchaseDate === undefined) continue;
        const header = IMPORT_COLUMNS.find((column) => column.key === field)?.header ?? field;
        messages.push(`${header}: ${issue.message}`);
      }
    } else {
      const serialKey = parsed.data.serialNumber.toLocaleUpperCase("tr-TR");
      const firstRow = serialRows.get(serialKey);
      if (firstRow) {
        messages.push(`Seri numarası dosyada tekrar ediyor (satır ${firstRow}).`);
      } else {
        serialRows.set(serialKey, rowNumber);
      }
    }

    if (messages.length > 0) {
      errors.push({ row: rowNumber, messages });
    } else if (parsed.success) {
      rows.push({ row: rowNumber, data: parsed.data });
    }
  }

  if (rows.length === 0 && errors.length === 0) {
    throw badRequest("Dosyada içe aktarılacak satır bulunamadı.", "EMPTY_FILE");
  }

  // Sistemde kayıtlı seri numaraları (silinen cihazlarınki de dahil, numaralarını korurlar).
  const existing = await prisma.device.findMany({
    where: { serialNumber: { in: rows.map(({ data }) => data.serialNumber), mode: "insensitive" } },
    select: { serialNumber: true, assetTag: true },
  });
  const existingBySerial = new Map(existing.map((device) => [device.serialNumber.toLocaleUpperCase("tr-TR"), device]));
  for (const { row, data } of rows) {
    const match = existingBySerial.get(data.serialNumber.toLocaleUpperCase("tr-TR"));
    if (match) {
      errors.push({ row, messages: [`Bu seri numarası sistemde zaten kayıtlı (${match.assetTag}).`] });
    }
  }

  if (errors.length > 0) {
    errors.sort((a, b) => a.row - b.row);
    throw new HttpError(
      422,
      `${errors.length} satırda hata var. Hiçbir cihaz eklenmedi; hataları düzeltip dosyayı yeniden yükleyin.`,
      "IMPORT_VALIDATION_FAILED",
      errors,
    );
  }

  const assetTags = await prisma.$transaction(
    async (tx) => {
      const tags: string[] = [];
      for (const { data } of rows) {
        const device = await tx.device.create({
          data: { ...data, assetTag: await nextAssetTag(tx) },
          select: { id: true, assetTag: true, status: true },
        });
        await tx.deviceEvent.create({
          data: {
            deviceId: device.id,
            type: DeviceEventType.CREATED,
            toStatus: device.status,
            description: "Excel ile toplu içe aktarıldı.",
            performedById: actorId,
          },
        });
        tags.push(device.assetTag);
      }
      return tags;
    },
    { timeout: 60_000 },
  );

  return { created: assetTags.length, firstAssetTag: assetTags[0], lastAssetTag: assetTags.at(-1) };
}
