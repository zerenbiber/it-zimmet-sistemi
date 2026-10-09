import type { Role } from "../generated/prisma/enums.js";

declare global {
  namespace Express {
    interface Request {
      /** Populated by the `authenticate` middleware. */
      auth?: {
        userId: string;
        role: Role;
        mustChangePassword: boolean;
      };
    }
  }
}

export {};
