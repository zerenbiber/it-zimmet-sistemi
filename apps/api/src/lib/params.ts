import { z } from "zod";

const idSchema = z.uuid("Geçersiz kimlik.");

export function idParam(value: string | string[] | undefined): string {
  return idSchema.parse(value);
}
