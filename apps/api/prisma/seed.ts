import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "../src/generated/prisma/client.js";

const PASSWORD_HASH_ROUNDS = 12;

const DEFAULT_DEPARTMENTS = [
  "Bilgi Teknolojileri",
  "İnsan Kaynakları",
  "Muhasebe",
  "Satın Alma",
  "Yazı İşleri",
];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function seedDepartments() {
  for (const name of DEFAULT_DEPARTMENTS) {
    await prisma.department.upsert({ where: { name }, update: {}, create: { name } });
  }
}

async function seedAdminUser() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set to seed the admin user.");
  }

  const itDepartment = await prisma.department.findUniqueOrThrow({
    where: { name: "Bilgi Teknolojileri" },
  });

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      firstName: "Sistem",
      lastName: "Yöneticisi",
      email,
      passwordHash: await bcrypt.hash(password, PASSWORD_HASH_ROUNDS),
      role: Role.ADMIN,
      departmentId: itDepartment.id,
      // Seed şifresi .env dosyasında açıkta duruyor, bu yüzden ilk girişte değiştirilmesi zorunlu.
      mustChangePassword: true,
    },
  });
}

async function main() {
  await seedDepartments();
  await seedAdminUser();
}

main()
  .then(() => console.log("Database seeded successfully."))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
