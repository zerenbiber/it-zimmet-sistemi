/**
 * Sunum ve deneme için örnek personel ve cihaz ekler: npm run db:demo
 *
 * Kayıtlar uygulamanın kendi servisleriyle eklenir; demirbaş numaraları, zimmet
 * kuralları ve cihaz geçmişi gerçek kullanımdaki gibi oluşur. Tarihler sonradan
 * geçmişe çekilir ki geçmiş ve "son hareketler" doğal görünsün.
 * Tekrar çalıştırılırsa zaten var olan e-posta ve seri numaraları atlanır.
 */
import "dotenv/config";
import { DeviceStatus, DeviceType, Role } from "../src/generated/prisma/enums.js";
import { hashPassword } from "../src/lib/password.js";
import { prisma } from "../src/lib/prisma.js";
import * as devices from "../src/modules/devices/devices.service.js";

/** Örnek personelin ortak şifresi; giriş yapınca şifre değiştirme istenmez. */
const DEMO_PASSWORD = "Personel2026";

const PEOPLE = [
  { firstName: "Elif", lastName: "Demir", title: "İnsan Kaynakları Uzmanı", department: "İnsan Kaynakları" },
  { firstName: "Hakan", lastName: "Çelik", title: "İnsan Kaynakları Müdürü", department: "İnsan Kaynakları" },
  { firstName: "Burak", lastName: "Şahin", title: "Muhasebe Şefi", department: "Muhasebe" },
  { firstName: "Zeynep", lastName: "Arslan", title: "Muhasebe Uzmanı", department: "Muhasebe" },
  { firstName: "Mert", lastName: "Öztürk", title: "Satın Alma Sorumlusu", department: "Satın Alma" },
  { firstName: "Deniz", lastName: "Kurt", title: "Satın Alma Uzmanı", department: "Satın Alma" },
  { firstName: "Selin", lastName: "Aydın", title: "Yazı İşleri Memuru", department: "Yazı İşleri" },
  { firstName: "Can", lastName: "Yıldız", title: "Yazılım Geliştirici", department: "Bilgi Teknolojileri" },
  { firstName: "Ece", lastName: "Koç", title: "Teknik Destek Uzmanı", department: "Bilgi Teknolojileri" },
  { firstName: "Okan", lastName: "Polat", title: "Ağ Yöneticisi", department: "Bilgi Teknolojileri" },
];

type Step =
  | { assign: string; at: string; note?: string }
  | { return: string; at: string; status?: "IN_STOCK" | "FAULTY"; note?: string }
  | { status: "FAULTY" | "IN_REPAIR" | "IN_STOCK" | "RETIRED"; at: string; note?: string };

interface DemoDevice {
  type: DeviceType;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyEndDate?: string;
  notes?: string;
  /** Envantere eklendiği gün. */
  addedAt: string;
  steps?: Step[];
}

// Kişiler e-postanın @ öncesiyle anılıyor (ör. "elif.demir").
const DEVICES: DemoDevice[] = [
  {
    type: DeviceType.LAPTOP, brand: "Lenovo", model: "ThinkPad T14 Gen 4", serialNumber: "PF4XK2M1",
    purchaseDate: "2025-02-10", warrantyEndDate: "2028-02-10", addedAt: "2025-02-14",
    steps: [{ assign: "can.yildiz", at: "2025-02-17", note: "Geliştirme bilgisayarı." }],
  },
  {
    type: DeviceType.LAPTOP, brand: "Dell", model: "Latitude 5440", serialNumber: "7HJ2K93",
    purchaseDate: "2025-04-03", warrantyEndDate: "2028-04-03", addedAt: "2025-04-07",
    steps: [{ assign: "elif.demir", at: "2025-04-08" }],
  },
  {
    type: DeviceType.LAPTOP, brand: "HP", model: "EliteBook 840 G10", serialNumber: "5CG3341KLM",
    purchaseDate: "2024-09-12", warrantyEndDate: "2026-10-28", addedAt: "2024-09-16",
    steps: [
      { assign: "burak.sahin", at: "2024-09-18" },
      { return: "burak.sahin", at: "2025-06-02", note: "Yeni cihaz verildiği için iade alındı." },
      { assign: "zeynep.arslan", at: "2025-06-04" },
    ],
  },
  {
    type: DeviceType.LAPTOP, brand: "Apple", model: "MacBook Pro 14 M3", serialNumber: "C02XG2JHMD6M",
    purchaseDate: "2025-05-26", warrantyEndDate: "2027-05-26", addedAt: "2025-05-29",
    steps: [{ assign: "burak.sahin", at: "2025-06-02" }],
  },
  {
    type: DeviceType.LAPTOP, brand: "Lenovo", model: "ThinkPad E14 Gen 5", serialNumber: "PF3ZQ8LA",
    purchaseDate: "2024-03-05", warrantyEndDate: "2026-03-05", addedAt: "2024-03-08",
    steps: [
      { assign: "mert.ozturk", at: "2024-03-11" },
      { return: "mert.ozturk", at: "2026-09-22", status: "FAULTY", note: "Ekran menteşesi kırık." },
      { status: "IN_REPAIR", at: "2026-09-24", note: "Yetkili servise gönderildi." },
    ],
  },
  {
    type: DeviceType.DESKTOP, brand: "Dell", model: "OptiPlex 7010", serialNumber: "CN0F7G2",
    purchaseDate: "2024-01-15", warrantyEndDate: "2027-01-15", addedAt: "2024-01-19",
    steps: [{ assign: "selin.aydin", at: "2024-01-22" }],
  },
  {
    type: DeviceType.DESKTOP, brand: "HP", model: "ProDesk 400 G9", serialNumber: "CZC3197XK2",
    purchaseDate: "2024-05-08", warrantyEndDate: "2026-11-05", addedAt: "2024-05-10",
    steps: [{ assign: "hakan.celik", at: "2024-05-13" }],
  },
  {
    type: DeviceType.DESKTOP, brand: "Lenovo", model: "ThinkCentre M70q Gen 4", serialNumber: "MJ0K7T2P",
    purchaseDate: "2026-08-19", warrantyEndDate: "2029-08-19", addedAt: "2026-08-25",
    notes: "Yeni gelen personel için ayrıldı.",
  },
  {
    type: DeviceType.MONITOR, brand: "Dell", model: "P2423D", serialNumber: "CN0V7K4R",
    purchaseDate: "2025-02-10", warrantyEndDate: "2028-02-10", addedAt: "2025-02-14",
    steps: [{ assign: "can.yildiz", at: "2025-02-17", note: "İkinci ekran." }],
  },
  {
    type: DeviceType.MONITOR, brand: "LG", model: "27UP850-W", serialNumber: "309NTRL4B921",
    purchaseDate: "2025-04-03", warrantyEndDate: "2027-04-03", addedAt: "2025-04-07",
    steps: [{ assign: "zeynep.arslan", at: "2025-04-09" }],
  },
  {
    type: DeviceType.MONITOR, brand: "Samsung", model: "S24C450", serialNumber: "HCJM702145",
    purchaseDate: "2023-11-20", warrantyEndDate: "2025-11-20", addedAt: "2023-11-24",
    steps: [
      { status: "FAULTY", at: "2026-10-06", note: "Görüntüde dikey çizgiler var." },
    ],
  },
  {
    type: DeviceType.PRINTER, brand: "HP", model: "LaserJet Pro M404dn", serialNumber: "PHBBL41923",
    purchaseDate: "2023-06-14", warrantyEndDate: "2026-06-14", addedAt: "2023-06-16",
    notes: "Muhasebe katı ortak yazıcı.",
  },
  {
    type: DeviceType.PRINTER, brand: "Canon", model: "i-SENSYS MF453dw", serialNumber: "XGF08217",
    purchaseDate: "2024-10-01", warrantyEndDate: "2026-11-10", addedAt: "2024-10-03",
    notes: "İnsan Kaynakları ortak yazıcı.",
  },
  {
    type: DeviceType.NETWORK, brand: "Cisco", model: "Catalyst 9200L-24P", serialNumber: "JAE24461KQ3",
    purchaseDate: "2024-02-20", warrantyEndDate: "2029-02-20", addedAt: "2024-02-22",
    notes: "Sistem odası, kabin 2.",
  },
  {
    type: DeviceType.NETWORK, brand: "Ubiquiti", model: "UniFi U6 Pro", serialNumber: "E063DA1F7C21",
    purchaseDate: "2025-01-09", warrantyEndDate: "2027-01-09", addedAt: "2025-01-13",
    notes: "2. kat koridor.",
  },
  {
    type: DeviceType.SERVER, brand: "Dell", model: "PowerEdge R650", serialNumber: "8TQ4XN3",
    purchaseDate: "2024-02-20", warrantyEndDate: "2029-02-20", addedAt: "2024-02-22",
    steps: [{ assign: "okan.polat", at: "2024-02-26", note: "Sanallaştırma sunucusu, sorumlusu." }],
  },
  {
    type: DeviceType.PHONE, brand: "Samsung", model: "Galaxy A55", serialNumber: "R5CX21ABKLM",
    purchaseDate: "2025-09-01", warrantyEndDate: "2027-09-01", addedAt: "2025-09-03",
    steps: [{ assign: "deniz.kurt", at: "2025-09-04", note: "Tedarikçi görüşmeleri için." }],
  },
  {
    type: DeviceType.PHONE, brand: "Apple", model: "iPhone 15", serialNumber: "F2LZK9QXN7",
    purchaseDate: "2025-09-01", warrantyEndDate: "2026-09-01", addedAt: "2025-09-03",
    steps: [
      { assign: "hakan.celik", at: "2025-09-05" },
      { return: "hakan.celik", at: "2026-07-14", note: "Görev değişikliği." },
    ],
  },
  {
    type: DeviceType.TABLET, brand: "Samsung", model: "Galaxy Tab S9 FE", serialNumber: "R52W60HJT4",
    purchaseDate: "2025-11-12", warrantyEndDate: "2027-11-12", addedAt: "2025-11-14",
    steps: [{ assign: "ece.koc", at: "2025-11-17", note: "Saha destek tableti." }],
  },
  {
    type: DeviceType.PERIPHERAL, brand: "Logitech", model: "MX Keys Combo", serialNumber: "2219LZ0BXK48",
    purchaseDate: "2025-02-10", addedAt: "2025-02-14",
    steps: [{ assign: "can.yildiz", at: "2025-02-17" }],
  },
  {
    type: DeviceType.LAPTOP, brand: "HP", model: "ProBook 450 G6", serialNumber: "5CD9123ZPQ",
    purchaseDate: "2019-08-20", warrantyEndDate: "2021-08-20", addedAt: "2019-08-26",
    steps: [{ status: "RETIRED", at: "2026-05-11", note: "Anakart arızası, onarım ekonomik değil." }],
  },
];

const day = (iso: string) => new Date(`${iso}T09:30:00+03:00`);

const emailOf = (p: { firstName: string; lastName: string }) => {
  const ascii = (s: string) =>
    s.toLocaleLowerCase("tr").replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c]!);
  return `${ascii(p.firstName)}.${ascii(p.lastName)}@zimmet.local`;
};

async function seedPeople() {
  const departments = new Map((await prisma.department.findMany()).map((d) => [d.name, d.id]));
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  let created = 0;

  for (const person of PEOPLE) {
    const email = emailOf(person);
    if (await prisma.user.findUnique({ where: { email } })) continue;
    await prisma.user.create({
      data: {
        firstName: person.firstName,
        lastName: person.lastName,
        email,
        title: person.title,
        phone: `0532 ${String(100 + created * 37).padStart(3, "0")} ${String(10 + created * 7).padStart(2, "0")} ${String(20 + created * 3).padStart(2, "0")}`,
        role: Role.STAFF,
        departmentId: departments.get(person.department),
        passwordHash,
        passwordChangedAt: day("2026-01-05"),
      },
    });
    created++;
  }
  return created;
}

/** Servisin "şimdi" olarak yazdığı son kaydı verilen tarihe çeker. */
async function backdateLastEvent(deviceId: string, at: Date) {
  const event = await prisma.deviceEvent.findFirstOrThrow({ where: { deviceId }, orderBy: { createdAt: "desc" } });
  await prisma.deviceEvent.update({ where: { id: event.id }, data: { createdAt: at } });
}

async function seedDevices(adminId: string) {
  const userIds = new Map(
    (await prisma.user.findMany({ where: { deletedAt: null } })).map((u) => [u.email.split("@")[0]!, u.id]),
  );
  let created = 0;

  for (const demo of DEVICES) {
    if (await prisma.device.findUnique({ where: { serialNumber: demo.serialNumber } })) continue;

    const device = await devices.createDevice(
      {
        type: demo.type,
        brand: demo.brand,
        model: demo.model,
        serialNumber: demo.serialNumber,
        purchaseDate: new Date(demo.purchaseDate),
        warrantyEndDate: demo.warrantyEndDate ? new Date(demo.warrantyEndDate) : null,
        notes: demo.notes ?? null,
      },
      adminId,
    );
    await prisma.device.update({ where: { id: device.id }, data: { createdAt: day(demo.addedAt) } });
    await backdateLastEvent(device.id, day(demo.addedAt));

    for (const step of demo.steps ?? []) {
      const at = day(step.at);
      if ("assign" in step) {
        const userId = userIds.get(step.assign);
        if (!userId) throw new Error(`Personel bulunamadı: ${step.assign}`);
        await devices.assignDevice(device.id, { userId, note: step.note }, adminId);
        await prisma.assignment.updateMany({ where: { deviceId: device.id, returnedAt: null }, data: { assignedAt: at } });
      } else if ("return" in step) {
        const open = await prisma.assignment.findFirstOrThrow({ where: { deviceId: device.id, returnedAt: null } });
        await devices.returnDevice(device.id, { status: step.status ?? DeviceStatus.IN_STOCK, note: step.note }, adminId);
        await prisma.assignment.update({ where: { id: open.id }, data: { returnedAt: at } });
      } else {
        await devices.changeStatus(device.id, { status: step.status, note: step.note }, adminId);
      }
      await backdateLastEvent(device.id, at);
    }
    created++;
  }
  return created;
}

async function main() {
  const admin = await prisma.user.findFirstOrThrow({ where: { role: Role.ADMIN, deletedAt: null } });
  const people = await seedPeople();
  const deviceCount = await seedDevices(admin.id);
  console.log(`Örnek veri eklendi: ${people} personel, ${deviceCount} cihaz.`);
  console.log(`Örnek personel şifresi: ${DEMO_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
