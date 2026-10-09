import { Router } from "express";
import { Role } from "../../generated/prisma/enums.js";
import { idParam } from "../../lib/params.js";
import { authenticate, authorize } from "../../middlewares/authenticate.js";
import { validateBody } from "../../middlewares/validate.js";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "./users.schemas.js";
import * as usersService from "./users.service.js";

export const usersRouter = Router();

usersRouter.use(authenticate, authorize(Role.ADMIN));

usersRouter.get("/", async (req, res) => {
  res.json(await usersService.listUsers(listUsersQuerySchema.parse(req.query)));
});

usersRouter.get("/:id", async (req, res) => {
  res.json(await usersService.getUser(idParam(req.params.id)));
});

usersRouter.post("/", validateBody(createUserSchema), async (req, res) => {
  res.status(201).json(await usersService.createUser(req.body as CreateUserInput));
});

usersRouter.patch("/:id", validateBody(updateUserSchema), async (req, res) => {
  res.json(await usersService.updateUser(idParam(req.params.id), req.auth!.userId, req.body as UpdateUserInput));
});

/** Generates a new temporary password and e-mails it to the user. */
usersRouter.post("/:id/reset-password", async (req, res) => {
  await usersService.resetPassword(idParam(req.params.id), req.auth!.userId);
  res.status(204).end();
});

usersRouter.delete("/:id", async (req, res) => {
  await usersService.deleteUser(idParam(req.params.id), req.auth!.userId);
  res.status(204).end();
});
