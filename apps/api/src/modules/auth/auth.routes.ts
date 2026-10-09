import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { validateBody } from "../../middlewares/validate.js";
import { loginSchema, refreshSchema, type LoginInput, type RefreshInput } from "./auth.schemas.js";
import * as authService from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/login", validateBody(loginSchema), async (req, res) => {
  res.json(await authService.login(req.body as LoginInput));
});

authRouter.post("/refresh", validateBody(refreshSchema), async (req, res) => {
  const { refreshToken } = req.body as RefreshInput;
  res.json(await authService.refresh(refreshToken));
});

authRouter.post("/logout", validateBody(refreshSchema), async (req, res) => {
  const { refreshToken } = req.body as RefreshInput;
  await authService.logout(refreshToken);
  res.status(204).end();
});

authRouter.get("/me", authenticate, async (req, res) => {
  res.json({ user: await authService.getCurrentUser(req.auth!.userId) });
});
