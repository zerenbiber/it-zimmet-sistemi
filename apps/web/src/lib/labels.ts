import type { DeviceEventType, DeviceStatus, DeviceType, Role } from "../api/types";

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

export const DEVICE_EVENT_LABELS: Record<DeviceEventType, string> = {
  CREATED: "Envantere eklendi",
  UPDATED: "Bilgiler güncellendi",
  ASSIGNED: "Zimmetlendi",
  RETURNED: "İade alındı",
  STATUS_CHANGED: "Durum değişti",
  FAULT_REPORTED: "Arıza bildirildi",
  DELETED: "Silindi",
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Yönetici",
  STAFF: "Personel",
};

export const DEVICE_TYPES = Object.keys(DEVICE_TYPE_LABELS) as DeviceType[];
export const DEVICE_STATUSES = Object.keys(DEVICE_STATUS_LABELS) as DeviceStatus[];
