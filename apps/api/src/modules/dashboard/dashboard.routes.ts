import { Router } from "express";
import { DeviceStatus, Role } from "../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { authenticate, authorize } from "../../middlewares/authenticate.js";

const WARRANTY_WARNING_DAYS = 30;

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, authorize(Role.ADMIN));

dashboardRouter.get("/", async (_req, res) => {
  const today = new Date();
  const warrantyLimit = new Date(today.getTime() + WARRANTY_WARNING_DAYS * 24 * 60 * 60 * 1000);

  const [byStatus, byType, userCount, expiringWarranties, recentEvents] = await prisma.$transaction([
    prisma.device.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      orderBy: { status: "asc" },
      _count: { _all: true },
    }),
    prisma.device.groupBy({
      by: ["type"],
      where: { deletedAt: null },
      orderBy: { type: "asc" },
      _count: { _all: true },
    }),
    prisma.user.count({ where: { deletedAt: null, isActive: true } }),
    prisma.device.findMany({
      where: {
        deletedAt: null,
        status: { not: DeviceStatus.RETIRED },
        warrantyEndDate: { gte: today, lte: warrantyLimit },
      },
      orderBy: { warrantyEndDate: "asc" },
      take: 10,
      select: { id: true, assetTag: true, brand: true, model: true, warrantyEndDate: true },
    }),
    prisma.deviceEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        description: true,
        createdAt: true,
        device: { select: { id: true, assetTag: true, brand: true, model: true } },
        performedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);

  const statusCounts = Object.fromEntries(Object.values(DeviceStatus).map((status) => [status, 0])) as Record<
    DeviceStatus,
    number
  >;
  for (const row of byStatus) {
    statusCounts[row.status] = (row._count as { _all: number })._all;
  }

  res.json({
    totalDevices: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
    statusCounts,
    typeCounts: byType.map((row) => ({ type: row.type, count: (row._count as { _all: number })._all })),
    activeUserCount: userCount,
    expiringWarranties,
    recentEvents,
  });
});
