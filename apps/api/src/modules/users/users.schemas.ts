import { z } from "zod";
import { Role } from "../../generated/prisma/enums.js";
import { optionalQuery, paginationSchema } from "../../lib/pagination.js";

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullish();

const passwordSchema = z.string().min(8, "Şifre en az 8 karakter olmalı.").max(128);

const userFields = {
  firstName: z.string().trim().min(1, "Ad gerekli.").max(50),
  lastName: z.string().trim().min(1, "Soyad gerekli.").max(50),
  email: z.string().trim().toLowerCase().pipe(z.email("Geçerli bir e-posta adresi girin.")),
  title: nullableText(100),
  phone: nullableText(20),
  departmentId: z.uuid().nullish(),
};

export const createUserSchema = z.object({
  ...userFields,
  role: z.enum(Role).default(Role.STAFF),
  password: passwordSchema,
});

export const updateUserSchema = z
  .object({
    ...userFields,
    role: z.enum(Role),
    isActive: z.boolean(),
    password: passwordSchema,
  })
  .partial();

export const listUsersQuerySchema = paginationSchema.extend({
  search: optionalQuery(z.string().trim().max(100)),
  departmentId: optionalQuery(z.uuid()),
  role: optionalQuery(z.enum(Role)),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
