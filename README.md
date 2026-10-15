# IT Demirbaş ve Zimmet Yönetim Sistemi

Bir kurumun bilgisayar, monitör, yazıcı, telefon gibi BT cihazlarını kayıt altına alan,
hangi cihazın kimde olduğunu takip eden ve teslim/iade tutanaklarını hazırlayan bir sistem.
Web yönetim paneli ve Kotlin ile yazılmış bir Android uygulamasından oluşuyor.

Kâğıt ya da Excel üzerinden yürüyen zimmet takibini tek bir yerde topluyor: cihaz kime verildi,
ne zaman geri alındı, garantisi ne zaman bitiyor, arızalı mı, hepsi kayıt altında.

## Ekran Görüntüleri

| Gösterge paneli | Cihaz listesi |
| --- | --- |
| ![Gösterge paneli](docs/ekran-goruntuleri/gosterge-paneli.png) | ![Cihaz listesi](docs/ekran-goruntuleri/cihazlar.png) |

| Cihaz detayı (QR kod ve geçmiş) | Zimmet tutanağı |
| --- | --- |
| ![Cihaz detayı](docs/ekran-goruntuleri/cihaz-detay.png) | ![Zimmet tutanağı](docs/ekran-goruntuleri/tutanak.png) |

| Giriş ekranı | Personel listesi |
| --- | --- |
| ![Giriş](docs/ekran-goruntuleri/giris.png) | ![Personel](docs/ekran-goruntuleri/personel.png) |

**Mobil uygulama**

| Giriş | QR okutma |
| --- | --- |
| ![Mobil giriş](docs/ekran-goruntuleri/mobil-giris.png) | ![QR okutma](docs/ekran-goruntuleri/mobil-qr.png) |

| Cihaz detayı (admin) | Zimmetlerim (personel) |
| --- | --- |
| ![Mobil cihaz detayı](docs/ekran-goruntuleri/mobil-cihaz.png) | ![Zimmetlerim](docs/ekran-goruntuleri/mobil-zimmetlerim.png) |

## Özellikler

**Cihaz yönetimi**
- Cihaz ekleme, düzenleme, silme (tür, marka, model, seri no, alım tarihi, garanti bitişi)
- Her cihaza otomatik demirbaş numarası verilir (ör. `IT-2026-00042`), numara her yıl baştan başlar
- Her cihaz için QR kod üretilir
- Durum takibi: Stokta, Zimmetli, Arızalı, Tamirde, Hurda
- Cihazın tüm geçmişi (eklendi, zimmetlendi, iade edildi, arıza bildirildi...) zaman çizelgesinde görünür
- Excel'e dışa aktarma ve hazır şablonla Excel'den toplu cihaz ekleme

**Zimmet işlemleri**
- Cihazı personele zimmetleme ve iade alma
- Yazdırılabilir zimmet teslim ve iade tutanakları
- Bir cihazın aynı anda sadece bir açık zimmeti olabilir (veritabanı seviyesinde garanti)

**Personel ve departmanlar**
- Personel ekleme; şifre sistem tarafından üretilip e-postayla gönderilir
- İlk girişte geçici şifrenin değiştirilmesi zorunlu
- Departman yönetimi

**Gösterge paneli**
- Durumlara ve türlere göre cihaz sayıları
- Garantisi 30 gün içinde bitecek cihazlar
- Son yapılan işlemler

**Roller**
- **Admin:** her şeyi yönetir.
- **Personel:** sadece kendi üzerindeki zimmetleri ve tutanaklarını görür.

**Mobil uygulama (Android)**
- Admin, cihazın üzerindeki QR etiketi okutarak cihazın bilgilerine, kimde olduğuna ve geçmişine ulaşır
- Kamera yoksa demirbaş numarası elle yazılarak da aranabilir
- Personel kendi üzerindeki ve geçmişte kullandığı cihazları görür
- Geçici şifreyle girenler önce şifresini değiştirir (kurallar yazarken kontrol edilir)
- Uygulama kapanıp açılınca oturum devam eder, token süresi dolunca arka planda yenilenir

**Diğer**
- Açık / koyu tema
- Telefonda da kullanılabilen arayüz (alt sekme çubuğu)
- Türkçe karakterlere duyarlı arama ("YILMAZ" yazınca "Yılmaz" da bulunur)

## Kullanılan Teknolojiler

| Katman | Teknoloji |
| --- | --- |
| Backend (API) | Node.js, Express 5, TypeScript |
| Veritabanı | PostgreSQL 17, Prisma ORM |
| Doğrulama | Zod |
| Kimlik doğrulama | JWT (access + refresh token), bcrypt |
| Frontend (Web) | React 19, Vite, React Router, TanStack Query |
| Excel | ExcelJS |
| E-posta | Nodemailer (geliştirmede Mailpit) |
| Mobil | Kotlin, Jetpack Compose, Material 3, Navigation Compose |
| Mobil ağ / veri | Retrofit, OkHttp, kotlinx.serialization, DataStore |
| Mobil QR okuma | CameraX, ML Kit Barcode Scanning |
| Altyapı | Docker Compose |

## Proje Yapısı

Proje tek bir depo içinde birden fazla uygulama barındıran (monorepo) bir yapıda, npm workspaces kullanılıyor.

```
it-zimmet-sistemi/
├── apps/
│   ├── api/                  → Backend (REST API)
│   │   ├── prisma/
│   │   │   ├── schema.prisma → Veritabanı tabloları
│   │   │   ├── migrations/   → Veritabanı değişiklik geçmişi
│   │   │   └── seed.ts       → İlk admin ve örnek departmanlar
│   │   └── src/
│   │       ├── config/       → Ortam değişkenlerinin kontrolü
│   │       ├── lib/          → Ortak yardımcılar (şifre, e-posta, arama, sayfalama)
│   │       ├── middlewares/  → Giriş kontrolü, doğrulama, hata yakalama
│   │       ├── modules/      → Her özellik kendi klasöründe
│   │       │   ├── auth/         giriş, çıkış, token yenileme, şifre değiştirme
│   │       │   ├── devices/      cihazlar, zimmet/iade, Excel içe/dışa aktarma
│   │       │   ├── assignments/  zimmet listesi ve tutanak verisi
│   │       │   ├── users/        personel işlemleri
│   │       │   ├── departments/  departmanlar
│   │       │   └── dashboard/    gösterge paneli verileri
│   │       ├── app.ts        → Express uygulaması ve rotalar
│   │       └── server.ts     → Sunucuyu başlatan dosya
│   │
│   ├── web/                  → Frontend (yönetim paneli)
│   │   └── src/
│   │       ├── api/          → API istekleri ve tipler
│   │       ├── auth/         → Oturum yönetimi
│   │       ├── components/   → Ortak bileşenler (menü, modal, ikonlar)
│   │       ├── lib/          → Tarih biçimleme, tema, yardımcı hook'lar
│   │       ├── pages/        → Sayfalar
│   │       └── styles.css    → Tüm stiller
│   │
│   └── mobile/               → Android uygulaması (Kotlin + Jetpack Compose)
│       └── app/src/main/java/com/itzimmet/mobile/
│           ├── data/
│           │   ├── remote/   → Retrofit arayüzü, API modelleri, token ekleme ve yenileme
│           │   ├── local/    → Refresh token'ın saklandığı DataStore
│           │   └── *Repository.kt → Ekranların veriye ulaştığı katman
│           ├── ui/           → Ekranlar; her ekranın kendi ViewModel'i var (MVVM)
│           │   ├── login/, password/, home/, scan/, device/, assignments/, profile/
│           │   ├── components/ → Ortak parçalar (kart, rozet, form alanları)
│           │   └── theme/    → Renkler (web ile aynı)
│           ├── util/         → Türkçe etiketler, tarih biçimleme
│           └── AppContainer.kt → Bağımlılıkların kurulduğu yer
│
├── docker-compose.yml        → PostgreSQL ve Mailpit
└── package.json              → Workspace tanımı ve ortak komutlar
```

Backend'de her modül kendi `routes` (uç noktalar), `schemas` (gelen verinin doğrulanması) ve
`service` (iş mantığı) dosyalarına ayrılmış durumda.

Mobil uygulama MVVM yapısında: ekran (Composable) sadece çizer, ViewModel durumu tutar,
Repository API ile konuşur. Hangi ekranın açılacağına oturum durumu karar verir
(giriş yapılmamış → giriş, geçici şifre → şifre değiştirme, aksi halde ana ekran).

## Veritabanı

| Tablo | Açıklama |
| --- | --- |
| `departments` | Departmanlar |
| `users` | Personel ve adminler |
| `refresh_tokens` | Oturum yenileme anahtarları (sadece hash'i saklanır) |
| `devices` | Cihazlar |
| `asset_tag_counters` | Demirbaş numarası için yıllık sayaç |
| `assignments` | Zimmet kayıtları (kim, ne zaman aldı, ne zaman iade etti) |
| `device_events` | Cihaz üzerinde yapılan her işlemin kaydı |

Silinen kullanıcı ve cihazlar veritabanından tamamen kaldırılmıyor, sadece silindi olarak işaretleniyor.
Böylece geçmiş zimmet kayıtları bozulmuyor.

## Güvenlik

- Şifreler bcrypt ile hash'lenerek saklanır.
- Access token 15 dakika geçerli, sadece bellekte tutulur.
- Refresh token her kullanımda yenilenir. Daha önce kullanılmış bir token tekrar gelirse
  çalınmış sayılır ve kullanıcının tüm oturumları kapatılır.
- Şifre kuralı: en az 10 karakter, büyük harf, küçük harf ve rakam.
- Gelen tüm veriler Zod ile doğrulanır.
- Helmet ve CORS ayarları yapılmıştır.

## Kurulum

**Gereksinimler:** Node.js 22+, Docker

```bash
# 1. Depoyu klonla
git clone https://github.com/zerenbiber/it-zimmet-sistemi.git
cd it-zimmet-sistemi

# 2. Ortam dosyalarını oluştur
cp .env.example .env
cp apps/api/.env.example apps/api/.env

# 3. Veritabanı ve mail sunucusunu başlat
docker compose up -d

# 4. Paketleri yükle
npm install

# 5. Veritabanını hazırla
npm run db:generate --workspace apps/api
npm run db:migrate
npm run db:seed
npm run db:demo   # isteğe bağlı: örnek personel ve cihazlar

# 6. Uygulamaları çalıştır (iki ayrı terminalde)
npm run dev:api
npm run dev:web
```

| Adres | Ne var |
| --- | --- |
| http://localhost:5173 | Web arayüzü |
| http://localhost:4000/api | API |
| http://localhost:8025 | Mailpit (gönderilen e-postalar burada görünür) |

**İlk giriş:** `admin@zimmet.local` / `Admin123!` (ilk girişte şifre değiştirmeniz istenir)

`npm run db:demo` ile eklenen örnek personel `elif.demir@zimmet.local`, `can.yildiz@zimmet.local` gibi
adreslerle ve `Personel2026` şifresiyle giriş yapabilir.

Veritabanını tarayıcıda görmek için `npm run db:studio` (http://localhost:5555).

### Mobil uygulama

**Gereksinimler:** Android Studio, JDK 17

1. Android Studio'da `apps/mobile` klasörünü açın.
2. API yukarıdaki adımlarla çalışıyor olmalı.
3. Emülatörde çalıştırın. Emülatör bilgisayara `10.0.2.2` adresiyle ulaşır, varsayılan ayar budur.

Gerçek telefonda denemek için telefon ve bilgisayar aynı ağda olmalı. `apps/mobile/local.properties`
dosyasına bilgisayarın yerel IP adresini yazın:

```properties
zimmet.apiUrl=http://192.168.1.20:4000/api/
```

Komut satırından derlemek için: `cd apps/mobile && ./gradlew assembleDebug`

## API Uç Noktaları

| Metot | Adres | Açıklama |
| --- | --- | --- |
| POST | `/api/auth/login` | Giriş |
| POST | `/api/auth/refresh` | Token yenileme |
| POST | `/api/auth/logout` | Çıkış |
| GET | `/api/auth/me` | Giriş yapan kullanıcı |
| POST | `/api/auth/change-password` | Şifre değiştirme |
| GET | `/api/dashboard` | Gösterge paneli verileri |
| GET / POST / PATCH / DELETE | `/api/departments` | Departman işlemleri |
| GET / POST / PATCH / DELETE | `/api/users` | Personel işlemleri |
| POST | `/api/users/:id/reset-password` | Yeni geçici şifre gönderme |
| GET / POST / PATCH / DELETE | `/api/devices` | Cihaz işlemleri |
| GET | `/api/devices/by-tag/:assetTag` | Demirbaş numarasıyla (QR) cihaz bulma |
| POST | `/api/devices/:id/assign` | Zimmetleme |
| POST | `/api/devices/:id/return` | İade alma |
| POST | `/api/devices/:id/status` | Durum değiştirme |
| GET | `/api/devices/export` | Excel'e aktarma |
| GET | `/api/devices/import-template` | Excel içe aktarma şablonu |
| POST | `/api/devices/import` | Excel'den toplu ekleme |
| GET | `/api/assignments` | Zimmet listesi |
| GET | `/api/assignments/:id` | Tutanak verisi |

## Yol Haritası

- [x] Backend API ve veritabanı
- [x] Web yönetim paneli
- [x] Excel içe / dışa aktarma
- [x] Zimmet tutanakları
- [x] Mobil uygulama: QR ile cihaz bulma, personelin kendi zimmetleri
- [ ] Mobilden zimmetleme ve iade alma
- [ ] Testler
