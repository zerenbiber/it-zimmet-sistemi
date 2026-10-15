import type { Role } from "../generated/prisma/enums.js";

declare global {
  namespace Express {
    interface Request {
      /** `authenticate` middleware'i tarafından doldurulur. */
      auth?: {
        userId: string;
        role: Role;
        mustChangePassword: boolean;
      };
    }
  }
}

export {};
