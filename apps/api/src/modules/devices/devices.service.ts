import type { Prisma } from "../../generated/prisma/client.js";
import { DeviceEventType, DeviceStatus } from "../../generated/prisma/enums.js";
import { badRequest, conflict, notFound } from "../../lib/http-error.js";
import { paginate, paginated } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { containsAny } from "../../lib/search.js";
import type {
  AssignDeviceInput,
  ChangeStatusInput,
  CreateDeviceInput,
  ListDevicesQuery,
  ReturnDeviceInput,
  UpdateDeviceInput,
} from "./devices.schemas.js";

const personSelect = { id: true, firstName: true, lastName: true } as const;

export const deviceSelect = {
  id: true,
  assetTag: true,
  type: true,
  brand: true,
  model: true,
  serialNumber: true,
  purchaseDate: true,
  warrantyEndDate: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  assignments: {
    where: { returnedAt: null },
    select: {
      id: true,
      assignedAt: true,
      user: { select: { ...personSelect, email: true, department: { select: { id: true, name: true } } } },
    },
  },
} as const satisfies Prisma.DeviceSelect;

type SelectedDevice = Prisma.DeviceGetPayload<{ select: typeof deviceSelect }>;

function toPublicDevice({ assignments, ...device }: SelectedDevice) {
  return { ...device, currentAssignment: assignments[0] ?? null };
}

const STATUS_EVENT: Partial<Record<DeviceStatus, DeviceEventType>> = {
  [DeviceStatus.FAULTY]: DeviceEventType.FAULT_REPORTED,
};

/** Sıradaki demirbaş numarasını üretir (ör. IT-2026-00042), sayaç her yıl baştan başlar. */
export async function nextAssetTag(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const [row] = await tx.$queryRaw<{ last_value: number }[]>`
    INSERT INTO asset_tag_counters (year, last_value) VALUES (${year}, 1)
    ON CONFLICT (year) DO UPDATE SET last_value = asset_tag_counters.last_value + 1
    RETURNING last_value`;
  return `IT-${year}-${String(row!.last_value).padStart(5, "0")}`;
}

async function findDevice(where: Prisma.DeviceWhereInput) {
  const device = await prisma.device.findFirst({ where: { ...where, deletedAt: null }, select: deviceSelect });
  if (!device) {
    throw notFound("Cihaz bulunamadı.");
  }
  return toPublicDevice(device);
}

export function buildDeviceWhere(query: Omit<ListDevicesQuery, "page" | "pageSize">): Prisma.DeviceWhereInput {
  return {
    deletedAt: null,
    status: query.status,
    type: query.type,
    ...(query.search && {
      OR: containsAny(query.search, (contains): Prisma.DeviceWhereInput[] => [
        { assetTag: contains },
        { serialNumber: contains },
        { brand: contains },
        { model: contains },
        {
          assignments: {
            some: { returnedAt: null, user: { OR: [{ firstName: contains }, { lastName: contains }] } },
          },
        },
      ]),
    }),
  };
}

export async function listDevices(query: ListDevicesQuery) {
  const where = buildDeviceWhere(query);

  const [devices, total] = await prisma.$transaction([
    prisma.device.findMany({ where, select: deviceSelect, orderBy: { createdAt: "desc" }, ...paginate(query) }),
    prisma.device.count({ where }),
  ]);

  return paginated(devices.map(toPublicDevice), total, query);
}

export async function getDevice(id: string) {
  const device = await findDevice({ id });

  const [assignments, events] = await prisma.$transaction([
    prisma.assignment.findMany({
      where: { deviceId: id },
      orderBy: { assignedAt: "desc" },
      select: {
        id: true,
        assignedAt: true,
        assignNote: true,
        returnedAt: true,
        returnNote: true,
        user: { select: personSelect },
        assignedBy: { select: personSelect },
        returnedTo: { select: personSelect },
      },
    }),
    prisma.deviceEvent.findMany({
      where: { deviceId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        fromStatus: true,
        toStatus: true,
        description: true,
        createdAt: true,
        performedBy: { select: personSelect },
      },
    }),
  ]);

  return { ...device, assignments, events };
}

export function getDeviceByAssetTag(assetTag: string) {
  return findDevice({ assetTag: assetTag.toUpperCase() });
}

export async function createDevice(data: CreateDeviceInput, actorId: string) {
  const device = await prisma.$transaction(async (tx) => {
    const created = await tx.device.create({
      data: { ...data, assetTag: await nextAssetTag(tx) },
      select: deviceSelect,
    });
    await tx.deviceEvent.create({
      data: {
        deviceId: created.id,
        type: DeviceEventType.CREATED,
        toStatus: created.status,
        description: "Cihaz envantere eklendi.",
        performedById: actorId,
      },
    });
    return created;
  });

  return toPublicDevice(device);
}

export async function updateDevice(id: string, data: UpdateDeviceInput, actorId: string) {
  await findDevice({ id });

  const device = await prisma.$transaction(async (tx) => {
    const updated = await tx.device.update({ where: { id }, data, select: deviceSelect });
    await tx.deviceEvent.create({
      data: {
        deviceId: id,
        type: DeviceEventType.UPDATED,
        description: "Cihaz bilgileri güncellendi.",
        performedById: actorId,
      },
    });
    return updated;
  });

  return toPublicDevice(device);
}

export async function changeStatus(id: string, { status, note }: ChangeStatusInput, actorId: string) {
  const device = await findDevice({ id });

  if (device.status === DeviceStatus.ASSIGNED) {
    throw conflict("Zimmetli bir cihazın durumu değiştirilemez; önce iade alın.", "DEVICE_ASSIGNED");
  }
  if (device.status === status) {
    throw badRequest("Cihaz zaten bu durumda.");
  }

  await prisma.$transaction(async (tx) => {
    // Koşullu güncelleme, aynı anda yapılan iki zimmete karşı koruyor.
    const { count } = await tx.device.updateMany({
      where: { id, status: device.status },
      data: { status },
    });
    if (count === 0) {
      throw conflict("Cihazın durumu başka bir işlemle değişti, sayfayı yenileyin.", "STALE_STATE");
    }
    await tx.deviceEvent.create({
      data: {
        deviceId: id,
        type: STATUS_EVENT[status] ?? DeviceEventType.STATUS_CHANGED,
        fromStatus: device.status,
        toStatus: status,
        description: note || null,
        performedById: actorId,
      },
    });
  });

  return findDevice({ id });
}

export async function deleteDevice(id: string, actorId: string) {
  const device = await findDevice({ id });

  if (device.status === DeviceStatus.ASSIGNED) {
    throw conflict("Zimmetli bir cihaz silinemez; önce iade alın.", "DEVICE_ASSIGNED");
  }

  await prisma.$transaction([
    prisma.device.update({ where: { id }, data: { deletedAt: new Date() } }),
    prisma.deviceEvent.create({
      data: { deviceId: id, type: DeviceEventType.DELETED, fromStatus: device.status, performedById: actorId },
    }),
  ]);
}

export async function assignDevice(id: string, { userId, note }: AssignDeviceInput, actorId: string) {
  const device = await findDevice({ id });

  if (device.status !== DeviceStatus.IN_STOCK) {
    throw conflict("Yalnızca stoktaki cihazlar zimmetlenebilir.", "DEVICE_NOT_AVAILABLE");
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null, isActive: true },
    select: personSelect,
  });
  if (!user) {
    throw badRequest("Seçilen personel bulunamadı veya pasif.");
  }

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.device.updateMany({
      where: { id, status: DeviceStatus.IN_STOCK },
      data: { status: DeviceStatus.ASSIGNED },
    });
    if (count === 0) {
      throw conflict("Cihaz başka bir işlemle zimmetlendi, sayfayı yenileyin.", "STALE_STATE");
    }
    await tx.assignment.create({
      data: { deviceId: id, userId, assignedById: actorId, assignNote: note || null },
    });
    await tx.deviceEvent.create({
      data: {
        deviceId: id,
        type: DeviceEventType.ASSIGNED,
        fromStatus: DeviceStatus.IN_STOCK,
        toStatus: DeviceStatus.ASSIGNED,
        description: `${user.firstName} ${user.lastName} adlı personele zimmetlendi.`,
        performedById: actorId,
      },
    });
  });

  return findDevice({ id });
}

export async function returnDevice(id: string, { status, note }: ReturnDeviceInput, actorId: string) {
  const device = await findDevice({ id });
  const open = device.currentAssignment;

  if (!open) {
    throw conflict("Bu cihaz kimseye zimmetli değil.", "DEVICE_NOT_ASSIGNED");
  }

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.assignment.updateMany({
      where: { id: open.id, returnedAt: null },
      data: { returnedAt: new Date(), returnedToId: actorId, returnNote: note || null },
    });
    if (count === 0) {
      throw conflict("Cihaz zaten iade alınmış, sayfayı yenileyin.", "STALE_STATE");
    }
    await tx.device.update({ where: { id }, data: { status } });
    await tx.deviceEvent.create({
      data: {
        deviceId: id,
        type: DeviceEventType.RETURNED,
        fromStatus: DeviceStatus.ASSIGNED,
        toStatus: status,
        description: `${open.user.firstName} ${open.user.lastName} adlı personelden iade alındı.${note ? ` Not: ${note}` : ""}`,
        performedById: actorId,
      },
    });
  });

  return findDevice({ id });
}
