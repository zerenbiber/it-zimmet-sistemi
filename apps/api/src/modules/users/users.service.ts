import type { Prisma } from "../../generated/prisma/client.js";
import { Role } from "../../generated/prisma/enums.js";
import { badRequest, conflict, HttpError, notFound } from "../../lib/http-error.js";
import { sendMail, temporaryPasswordMail } from "../../lib/mailer.js";
import { paginate, paginated } from "../../lib/pagination.js";
import { generateTemporaryPassword, hashPassword } from "../../lib/password.js";
import { prisma } from "../../lib/prisma.js";
import { containsAny } from "../../lib/search.js";
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from "./users.schemas.js";

/** Long enough for an SMTP round-trip inside the transaction. */
const MAIL_TRANSACTION_TIMEOUT_MS = 30_000;

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  title: true,
  phone: true,
  isActive: true,
  mustChangePassword: true,
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

/**
 * Sends the temporary password inside the transaction: if the e-mail cannot be
 * delivered, the change is rolled back and nobody is left with a password they never received.
 */
async function deliverTemporaryPassword(
  user: { email: string; firstName: string },
  password: string,
  reason: "created" | "reset",
) {
  try {
    await sendMail(temporaryPasswordMail({ to: user.email, firstName: user.firstName, password, reason }));
  } catch (error) {
    console.error("Temporary password e-mail failed:", error);
    throw new HttpError(502, "Şifre e-postası gönderilemedi; işlem geri alındı. E-posta ayarlarını kontrol edin.", "MAIL_FAILED");
  }
}

export async function createUser(data: CreateUserInput) {
  const password = generateTemporaryPassword();
  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(
    async (tx) => {
      const created = await tx.user.create({
        data: { ...data, passwordHash, mustChangePassword: true },
        select: userSelect,
      });
      await deliverTemporaryPassword(created, password, "created");
      return created;
    },
    { timeout: MAIL_TRANSACTION_TIMEOUT_MS },
  );

  return toPublicUser(user);
}

export async function resetPassword(id: string, actorId: string) {
  if (id === actorId) {
    throw badRequest("Kendi şifrenizi profil sayfasından değiştirin.");
  }
  const existing = await getUser(id);
  if (!existing.isActive) {
    throw badRequest("Pasif bir hesabın şifresi sıfırlanamaz; önce hesabı aktifleştirin.");
  }

  const password = generateTemporaryPassword();
  const passwordHash = await hashPassword(password);

  await prisma.$transaction(
    async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true } });
      await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await deliverTemporaryPassword(existing, password, "reset");
    },
    { timeout: MAIL_TRANSACTION_TIMEOUT_MS },
  );
}

export async function updateUser(id: string, actorId: string, data: UpdateUserInput) {
  const existing = await getUser(id);
  const roleChanged = data.role !== undefined && data.role !== existing.role;

  if (id === actorId && (data.isActive === false || (data.role && data.role !== Role.ADMIN))) {
    throw badRequest("Kendi hesabınızı pasifleştiremez veya yetkinizi düşüremezsiniz.");
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: userSelect,
  });

  // Deactivation or a role change ends every session of the user.
  if (data.isActive === false || roleChanged) {
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
