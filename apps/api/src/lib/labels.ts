import type { DeviceStatus, DeviceType } from "../generated/prisma/enums.js";

/** Turkish labels used in generated files; keep in sync with apps/web/src/lib/labels.ts. */
export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  LAPTOP: "Dizüstü Bilgisayar",
  DESKTOP: "Masaüstü Bilgisayar",
  SERVER: "Sunucu",
  MONITOR: "Monitör",
  PRINTER: "Yazıcı",
  NETWORK: "Ağ Cihazı",
  PHONE: "Telefon",
  TABLET: "Tablet",
  PERIPHERAL: "Çevre Birimi",
  OTHER: "Diğer",
};

export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  IN_STOCK: "Stokta",
  ASSIGNED: "Zimmetli",
  FAULTY: "Arızalı",
  IN_REPAIR: "Tamirde",
  RETIRED: "Hurdaya Ayrıldı",
};
