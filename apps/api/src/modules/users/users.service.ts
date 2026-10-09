import bcrypt from "bcryptjs";
import type { Prisma } from "../../generated/prisma/client.js";
import { Role } from "../../generated/prisma/enums.js";
import { badRequest, conflict, notFound } from "../../lib/http-error.js";
import { paginate, paginated } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { containsAny } from "../../lib/search.js";
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from "./users.schemas.js";

const PASSWORD_HASH_ROUNDS = 12;

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  title: true,
  phone: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  department: { select: { id: true, name: true } },
  _count: { select: { assignments: { where: { returnedAt: null } } } },
} as const satisfies Prisma.UserSelect;

type SelectedUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;

function toPublicUser({ _count, ...user }: SelectedUser) {
  return { ...user, activeAssignmentCount: _count.assignments };
}

async function revokeSessions(userId: string) {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function listUsers(query: ListUsersQuery) {
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    departmentId: query.departmentId,
    role: query.role,
    ...(query.search && {
      OR: containsAny(query.search, (contains): Prisma.UserWhereInput[] => [
        { firstName: contains },
        { lastName: contains },
        { email: contains },
      ]),
    }),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      ...paginate(query),
    }),
    prisma.user.count({ where }),
  ]);

  return paginated(users.map(toPublicUser), total, query);
}

export async function getUser(id: string) {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null }, select: userSelect });
  if (!user) {
    throw notFound("Personel bulunamadı.");
  }
  return toPublicUser(user);
}

export async function createUser({ password, ...data }: CreateUserInput) {
  const user = await prisma.user.create({
    data: { ...data, passwordHash: await bcrypt.hash(password, PASSWORD_HASH_ROUNDS) },
    select: userSelect,
  });
  return toPublicUser(user);
}

export async function updateUser(id: string, actorId: string, { password, ...data }: UpdateUserInput) {
  const existing = await getUser(id);
  const roleChanged = data.role !== undefined && data.role !== existing.role;

  if (id === actorId && (data.isActive === false || (data.role && data.role !== Role.ADMIN))) {
    throw badRequest("Kendi hesabınızı pasifleştiremez veya yetkinizi düşüremezsiniz.");
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...data,
      ...(password && { passwordHash: await bcrypt.hash(password, PASSWORD_HASH_ROUNDS) }),
    },
    select: userSelect,
  });

  // Deactivation, a role change or a new password ends every session of the user.
  if (data.isActive === false || roleChanged || password) {
    await revokeSessions(id);
  }

  return toPublicUser(user);
}

export async function deleteUser(id: string, actorId: string) {
  if (id === actorId) {
    throw badRequest("Kendi hesabınızı silemezsiniz.");
  }

  const user = await getUser(id);
  if (user.activeAssignmentCount > 0) {
    throw conflict("Üzerinde zimmetli cihaz bulunan personel silinemez.", "USER_HAS_ASSIGNMENTS");
  }

  // The email is released so that it can be reused by a new account.
  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false, email: `deleted-${id}@deleted.invalid` },
  });
  await revokeSessions(id);
}
