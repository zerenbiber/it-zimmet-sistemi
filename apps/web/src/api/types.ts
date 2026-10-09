export type Role = "ADMIN" | "STAFF";

export type DeviceType =
  | "LAPTOP"
  | "DESKTOP"
  | "SERVER"
  | "MONITOR"
  | "PRINTER"
  | "NETWORK"
  | "PHONE"
  | "TABLET"
  | "PERIPHERAL"
  | "OTHER";

export type DeviceStatus = "IN_STOCK" | "ASSIGNED" | "FAULTY" | "IN_REPAIR" | "RETIRED";

export type DeviceEventType =
  | "CREATED"
  | "UPDATED"
  | "ASSIGNED"
  | "RETURNED"
  | "STATUS_CHANGED"
  | "FAULT_REPORTED"
  | "DELETED";

export interface Ref {
  id: string;
  name: string;
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
}

export interface CurrentUser extends Person {
  email: string;
  role: Role;
  title: string | null;
  phone: string | null;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  department: Ref | null;
}

export interface User extends CurrentUser {
  isActive: boolean;
  createdAt: string;
  activeAssignmentCount: number;
}

export interface Department extends Ref {
  userCount: number;
}

export interface Device {
  id: string;
  assetTag: string;
  type: DeviceType;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyEndDate: string | null;
  status: DeviceStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  currentAssignment: {
    id: string;
    assignedAt: string;
    user: Person & { email: string; department: Ref | null };
  } | null;
}

export interface DeviceHistoryAssignment {
  id: string;
  assignedAt: string;
  assignNote: string | null;
  returnedAt: string | null;
  returnNote: string | null;
  user: Person;
  assignedBy: Person;
  returnedTo: Person | null;
}

export interface DeviceEvent {
  id: string;
  type: DeviceEventType;
  fromStatus: DeviceStatus | null;
  toStatus: DeviceStatus | null;
  description: string | null;
  createdAt: string;
  performedBy: Person | null;
}

export interface DeviceDetail extends Device {
  assignments: DeviceHistoryAssignment[];
  events: DeviceEvent[];
}

export interface Assignment {
  id: string;
  assignedAt: string;
  assignNote: string | null;
  returnedAt: string | null;
  returnNote: string | null;
  device: Pick<Device, "id" | "assetTag" | "type" | "brand" | "model" | "serialNumber">;
  user: Person & { department: Ref | null };
  assignedBy: Person;
  returnedTo: Person | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  totalDevices: number;
  statusCounts: Record<DeviceStatus, number>;
  typeCounts: { type: DeviceType; count: number }[];
  activeUserCount: number;
  expiringWarranties: Pick<Device, "id" | "assetTag" | "brand" | "model" | "warrantyEndDate">[];
  recentEvents: {
    id: string;
    type: DeviceEventType;
    description: string | null;
    createdAt: string;
    device: Pick<Device, "id" | "assetTag" | "brand" | "model">;
    performedBy: Person | null;
  }[];
}

interface DocumentPerson extends Person {
  title: string | null;
  department: Ref | null;
}

/** GET /assignments/:id — data for the printed hand-over and return forms. */
export interface AssignmentDocument {
  id: string;
  organizationName: string;
  assignedAt: string;
  assignNote: string | null;
  returnedAt: string | null;
  returnNote: string | null;
  device: Pick<
    Device,
    "id" | "assetTag" | "type" | "brand" | "model" | "serialNumber" | "purchaseDate" | "warrantyEndDate" | "notes"
  >;
  user: DocumentPerson & { email: string; phone: string | null };
  assignedBy: DocumentPerson;
  returnedTo: DocumentPerson | null;
}

export interface ImportRowError {
  row: number;
  messages: string[];
}

export interface ImportResult {
  created: number;
  firstAssetTag: string;
  lastAssetTag: string;
}
