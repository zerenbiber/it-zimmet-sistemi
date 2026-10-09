import { Router } from "express";
import { z } from "zod";
import { Role } from "../../generated/prisma/enums.js";
import { idParam } from "../../lib/params.js";
import { authenticate, authorize } from "../../middlewares/authenticate.js";
import { validateBody } from "../../middlewares/validate.js";
import {
  assignDeviceSchema,
  changeStatusSchema,
  createDeviceSchema,
  listDevicesQuerySchema,
  returnDeviceSchema,
  updateDeviceSchema,
  type AssignDeviceInput,
  type ChangeStatusInput,
  type CreateDeviceInput,
  type ReturnDeviceInput,
  type UpdateDeviceInput,
} from "./devices.schemas.js";
import * as devicesService from "./devices.service.js";

const assetTagSchema = z.string().trim().min(1).max(32);

export const devicesRouter = Router();

devicesRouter.use(authenticate, authorize(Role.ADMIN));

devicesRouter.get("/", async (req, res) => {
  res.json(await devicesService.listDevices(listDevicesQuerySchema.parse(req.query)));
});

/** Used when a device's QR code is scanned. */
devicesRouter.get("/by-tag/:assetTag", async (req, res) => {
  res.json(await devicesService.getDeviceByAssetTag(assetTagSchema.parse(req.params.assetTag)));
});

devicesRouter.get("/:id", async (req, res) => {
  res.json(await devicesService.getDevice(idParam(req.params.id)));
});

devicesRouter.post("/", validateBody(createDeviceSchema), async (req, res) => {
  res.status(201).json(await devicesService.createDevice(req.body as CreateDeviceInput, req.auth!.userId));
});

devicesRouter.patch("/:id", validateBody(updateDeviceSchema), async (req, res) => {
  res.json(
    await devicesService.updateDevice(idParam(req.params.id), req.body as UpdateDeviceInput, req.auth!.userId),
  );
});

devicesRouter.delete("/:id", async (req, res) => {
  await devicesService.deleteDevice(idParam(req.params.id), req.auth!.userId);
  res.status(204).end();
});

devicesRouter.post("/:id/status", validateBody(changeStatusSchema), async (req, res) => {
  res.json(
    await devicesService.changeStatus(idParam(req.params.id), req.body as ChangeStatusInput, req.auth!.userId),
  );
});

devicesRouter.post("/:id/assign", validateBody(assignDeviceSchema), async (req, res) => {
  res.json(
    await devicesService.assignDevice(idParam(req.params.id), req.body as AssignDeviceInput, req.auth!.userId),
  );
});

devicesRouter.post("/:id/return", validateBody(returnDeviceSchema), async (req, res) => {
  res.json(
    await devicesService.returnDevice(idParam(req.params.id), req.body as ReturnDeviceInput, req.auth!.userId),
  );
});
