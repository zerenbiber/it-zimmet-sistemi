import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { Role } from "../../generated/prisma/enums.js";
import { optionalQuery, paginate, paginated, paginationSchema } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middlewares/authenticate.js";

const listAssignmentsQuerySchema = paginationSchema.extend({
  active: optionalQuery(z.enum(["true", "false"]).transform((value) => value === "true")),
  userId: optionalQuery(z.uuid()),
  deviceId: optionalQuery(z.uuid()),
});

const personSelect = { id: true, firstName: true, lastName: true } as const;

export const assignmentsRouter = Router();

assignmentsRouter.use(authenticate);

/** Admins see every assignment; staff only see their own. */
assignmentsRouter.get("/", async (req, res) => {
  const query = listAssignmentsQuerySchema.parse(req.query);
  const userId = req.auth!.role === Role.ADMIN ? query.userId : req.auth!.userId;

  const where: Prisma.AssignmentWhereInput = {
    userId,
    deviceId: query.deviceId,
    ...(query.active !== undefined && { returnedAt: query.active ? null : { not: null } }),
  };

  const [assignments, total] = await prisma.$transaction([
    prisma.assignment.findMany({
      where,
      orderBy: { assignedAt: "desc" },
      select: {
        id: true,
        assignedAt: true,
        assignNote: true,
        returnedAt: true,
        returnNote: true,
        device: { select: { id: true, assetTag: true, type: true, brand: true, model: true, serialNumber: true } },
        user: { select: { ...personSelect, department: { select: { id: true, name: true } } } },
        assignedBy: { select: personSelect },
        returnedTo: { select: personSelect },
      },
      ...paginate(query),
    }),
    prisma.assignment.count({ where }),
  ]);

  res.json(paginated(assignments, total, query));
});
