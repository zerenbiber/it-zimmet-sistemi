import { Router } from "express";
import { z } from "zod";
import { Role } from "../../generated/prisma/enums.js";
import { conflict } from "../../lib/http-error.js";
import { idParam } from "../../lib/params.js";
import { prisma } from "../../lib/prisma.js";
import { authenticate, authorize } from "../../middlewares/authenticate.js";
import { validateBody } from "../../middlewares/validate.js";

const departmentSchema = z.object({
  name: z.string().trim().min(2, "Departman adı en az 2 karakter olmalı.").max(100),
});

type DepartmentInput = z.infer<typeof departmentSchema>;

export const departmentsRouter = Router();

departmentsRouter.use(authenticate);

departmentsRouter.get("/", async (_req, res) => {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { users: { where: { deletedAt: null } } } },
    },
  });
  res.json({ items: departments.map(({ _count, ...department }) => ({ ...department, userCount: _count.users })) });
});

departmentsRouter.post("/", authorize(Role.ADMIN), validateBody(departmentSchema), async (req, res) => {
  const department = await prisma.department.create({
    data: req.body as DepartmentInput,
    select: { id: true, name: true },
  });
  res.status(201).json(department);
});

departmentsRouter.patch("/:id", authorize(Role.ADMIN), validateBody(departmentSchema), async (req, res) => {
  const department = await prisma.department.update({
    where: { id: idParam(req.params.id) },
    data: req.body as DepartmentInput,
    select: { id: true, name: true },
  });
  res.json(department);
});

departmentsRouter.delete("/:id", authorize(Role.ADMIN), async (req, res) => {
  const id = idParam(req.params.id);
  const userCount = await prisma.user.count({ where: { departmentId: id, deletedAt: null } });
  if (userCount > 0) {
    throw conflict("Bu departmanda personel bulunduğu için silinemez.", "DEPARTMENT_NOT_EMPTY");
  }
  await prisma.department.delete({ where: { id } });
  res.status(204).end();
});
