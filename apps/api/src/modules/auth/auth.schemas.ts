import { z } from "zod";
import { passwordPolicySchema } from "../../lib/password.js";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Geçerli bir e-posta adresi girin.")),
  password: z.string().min(1, "Şifre gerekli.").max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Yenileme anahtarı gerekli.").max(512),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifre gerekli.").max(128),
  newPassword: passwordPolicySchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
