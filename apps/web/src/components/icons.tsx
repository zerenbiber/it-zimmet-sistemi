import {
  ArrowLeftRight,
  CircleHelp,
  Cpu,
  Laptop,
  Monitor,
  Mouse,
  PackagePlus,
  Pencil,
  Printer,
  RotateCcw,
  Router,
  Server,
  Smartphone,
  Tablet,
  TriangleAlert,
  Trash2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { DeviceEventType, DeviceType } from "../api/types";

export const DEVICE_TYPE_ICONS: Record<DeviceType, LucideIcon> = {
  LAPTOP: Laptop,
  DESKTOP: Cpu,
  SERVER: Server,
  MONITOR: Monitor,
  PRINTER: Printer,
  NETWORK: Router,
  PHONE: Smartphone,
  TABLET: Tablet,
  PERIPHERAL: Mouse,
  OTHER: CircleHelp,
};

export function DeviceTypeIcon({ type, size = 16 }: { type: DeviceType; size?: number }) {
  const Icon = DEVICE_TYPE_ICONS[type];
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" />;
}

/** Tone names map to the `--tone-*` colour tokens in styles.css. */
export type Tone = "good" | "info" | "warning" | "critical" | "neutral" | "accent";

export const EVENT_STYLE: Record<DeviceEventType, { icon: LucideIcon; tone: Tone }> = {
  CREATED: { icon: PackagePlus, tone: "accent" },
  UPDATED: { icon: Pencil, tone: "neutral" },
  ASSIGNED: { icon: ArrowLeftRight, tone: "good" },
  RETURNED: { icon: RotateCcw, tone: "info" },
  STATUS_CHANGED: { icon: Wrench, tone: "warning" },
  FAULT_REPORTED: { icon: TriangleAlert, tone: "critical" },
  DELETED: { icon: Trash2, tone: "neutral" },
};

export function EventIcon({ type }: { type: DeviceEventType }) {
  const { icon: Icon, tone } = EVENT_STYLE[type];
  return (
    <span className={`event-icon tone-${tone}`} aria-hidden="true">
      <Icon size={14} strokeWidth={2} />
    </span>
  );
}
