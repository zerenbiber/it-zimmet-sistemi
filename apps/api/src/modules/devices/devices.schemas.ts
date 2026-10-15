import { z } from "zod";
import { DeviceStatus, DeviceType } from "../../generated/prisma/enums.js";
import { optionalQuery, paginationSchema } from "../../lib/pagination.js";

const dateOnly = z.iso.date("Tarih YYYY-AA-GG biçiminde olmalı.").transform((value) => new Date(value));

const deviceFields = {
  type: z.enum(DeviceType),
  brand: z.string().trim().min(1, "Marka gerekli.").max(100),
  model: z.string().trim().min(1, "Model gerekli.").max(100),
  serialNumber: z.string().trim().min(1, "Seri numarası gerekli.").max(100),
  purchaseDate: dateOnly,
  warrantyEndDate: dateOnly.nullish(),
  notes: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => value || null)
    .nullish(),
};

export const createDeviceSchema = z.object(deviceFields);

export const updateDeviceSchema = z.object(deviceFields).partial();

/** ASSIGNED durumuna sadece zimmet uç noktasıyla geçilir. */
export const changeStatusSchema = z.object({
  status: z.enum([DeviceStatus.IN_STOCK, DeviceStatus.FAULTY, DeviceStatus.IN_REPAIR, DeviceStatus.RETIRED]),
  note: z.string().trim().max(1000).optional(),
});

export const assignDeviceSchema = z.object({
  userId: z.uuid("Personel seçin."),
  note: z.string().trim().max(1000).optional(),
});

export const returnDeviceSchema = z.object({
  /** Cihazın iade edildiğindeki durumu. */
  status: z.enum([DeviceStatus.IN_STOCK, DeviceStatus.FAULTY]).default(DeviceStatus.IN_STOCK),
  note: z.string().trim().max(1000).optional(),
});

export const listDevicesQuerySchema = paginationSchema.extend({
  search: optionalQuery(z.string().trim().max(100)),
  status: optionalQuery(z.enum(DeviceStatus)),
  type: optionalQuery(z.enum(DeviceType)),
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type AssignDeviceInput = z.infer<typeof assignDeviceSchema>;
export type ReturnDeviceInput = z.infer<typeof returnDeviceSchema>;
export type ListDevicesQuery = z.infer<typeof listDevicesQuerySchema>;
