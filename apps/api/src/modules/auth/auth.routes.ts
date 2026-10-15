import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { validateBody } from "../../middlewares/validate.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  resetPasswordSchema,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type RefreshInput,
  type ResetPasswordInput,
} from "./auth.schemas.js";
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

authRouter.post("/forgot-password", validateBody(forgotPasswordSchema), async (req, res) => {
  await authService.requestPasswordReset(req.body as ForgotPasswordInput);
  res.status(204).end();
});

authRouter.post("/reset-password", validateBody(resetPasswordSchema), async (req, res) => {
  await authService.resetPasswordWithCode(req.body as ResetPasswordInput);
  res.status(204).end();
});

authRouter.get("/me", authenticate, async (req, res) => {
  res.json({ user: await authService.getCurrentUser(req.auth!.userId) });
});

authRouter.post("/change-password", authenticate, validateBody(changePasswordSchema), async (req, res) => {
  res.json(await authService.changePassword(req.auth!.userId, req.body as ChangePasswordInput));
});
