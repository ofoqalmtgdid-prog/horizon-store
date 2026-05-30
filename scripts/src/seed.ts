import {
  db,
  pool,
  categoriesTable,
  subcategoriesTable,
  productsTable,
  usersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const PLACEHOLDER = "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80";

const IMG = {
  laptop: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80",
  laptopPro: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
  laptopGaming: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&q=80",
  desktop: "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&q=80",
  aio: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&q=80",
  macbook: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=80",
  cameraDome: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&q=80",
  cameraOutdoor: "https://images.unsplash.com/photo-1601933470928-c2ee65b1ec5e?w=800&q=80",
  dvr: "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&q=80",
  cable: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80",
  router: "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=800&q=80",
  switch: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80",
  antenna: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  printer: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800&q=80",
  tv: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80",
  inverter: "https://images.unsplash.com/photo-1617104551722-3b2d51366400?w=800&q=80",
  battery: "https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=800&q=80",
  headphones: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
  speaker: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80",
  flash: "https://images.unsplash.com/photo-1618410320928-25228d811631?w=800&q=80",
  hdd: "https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=800&q=80",
  microsd: "https://images.unsplash.com/photo-1605775384057-bd0ed337349a?w=800&q=80",
  usbHub: "https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800&q=80",
  powerbank: "https://images.unsplash.com/photo-1609592494-f0e9b1afdc8e?w=800&q=80",
  pos: "https://images.unsplash.com/photo-1556741533-411cf82e4e2d?w=800&q=80",
};

type Sub = { slug: string; name: string };
type Cat = { slug: string; name: string; subs: Sub[] };

const CATEGORIES: Cat[] = [
  {
    slug: "cctv",
    name: "كاميرات المراقبة",
    subs: [
      { slug: "dahua-switch", name: "DAHUA - سويتش" },
      { slug: "dahua-cameras-indoor", name: "DAHUA - كاميرات داخلية" },
      { slug: "dahua-cameras-outdoor", name: "DAHUA - كاميرات خارجية" },
      { slug: "dahua-dvr", name: "DAHUA - DVR" },
      { slug: "dahua-xvr", name: "DAHUA - XVR" },
      { slug: "dahua-nvr", name: "DAHUA - NVR" },
      { slug: "dahua-cat6", name: "DAHUA - كوابل CAT6" },
      { slug: "imou-cameras-indoor", name: "IMOU - كاميرات داخلية" },
      { slug: "imou-cameras-outdoor", name: "IMOU - كاميرات خارجية" },
    ],
  },
  {
    slug: "laptops",
    name: "اللابتوبات",
    subs: [
      { slug: "used-laptop-hp", name: "لابتوب مستعمل HP" },
      { slug: "used-laptop-dell", name: "لابتوب مستعمل DELL" },
      { slug: "used-laptop-lenovo", name: "لابتوب مستعمل LENOVO" },
      { slug: "used-laptop-acer", name: "لابتوب مستعمل ACER" },
      { slug: "used-laptop-mac", name: "لابتوب مستعمل MAC" },
      { slug: "desktop-hp", name: "دسكتوب مكتبي HP" },
      { slug: "desktop-dell", name: "دسكتوب مكتبي DELL" },
      { slug: "desktop-lenovo", name: "دسكتوب مكتبي LENOVO" },
      { slug: "aio-hp", name: "الكل في واحد AIO - HP" },
      { slug: "aio-dell", name: "الكل في واحد AIO - DELL" },
      { slug: "aio-lenovo", name: "الكل في واحد AIO - LENOVO" },
      { slug: "new-laptop-hp", name: "لابتوب جديد HP" },
      { slug: "new-laptop-dell", name: "لابتوب جديد DELL" },
      { slug: "new-laptop-lenovo", name: "لابتوب جديد LENOVO" },
      { slug: "new-laptop-acer", name: "لابتوب جديد ACER" },
      { slug: "new-laptop-asus", name: "لابتوب جديد ASUS" },
      { slug: "new-laptop-mac", name: "لابتوب جديد MAC" },
      { slug: "new-desktop-hp", name: "دسكتوب جديد HP" },
      { slug: "new-desktop-dell", name: "دسكتوب جديد DELL" },
      { slug: "new-desktop-lenovo", name: "دسكتوب جديد LENOVO" },
      { slug: "gaming-hp", name: "لابتوب قيمنج HP" },
      { slug: "gaming-msi", name: "لابتوب قيمنج MSI" },
      { slug: "gaming-lenovo", name: "لابتوب قيمنج LENOVO" },
      { slug: "gaming-asus", name: "لابتوب قيمنج ASUS" },
      { slug: "pos-fq", name: "نقاط البيع FQ POS" },
      { slug: "pos-ncts", name: "نقاط البيع NCTS POS" },
    ],
  },
  {
    slug: "networking",
    name: "الشبكات والراوترات",
    subs: [
      { slug: "tplink-routers", name: "TP-LINK راوترات" },
      { slug: "tplink-switches", name: "TP-LINK سويتشات" },
      { slug: "tplink-antennas", name: "TP-LINK أنتينات" },
      { slug: "tplink-4g", name: "TP-LINK 4G" },
      { slug: "tplink-signal-outdoor", name: "TP-LINK مقويات إشارة خارجية" },
      { slug: "tplink-signal-indoor", name: "TP-LINK مقويات إشارة داخلية" },
      { slug: "tplink-wifi-receiver", name: "TP-LINK لاقط واي فاي" },
      { slug: "cudy-routers", name: "CUDY راوترات" },
      { slug: "cudy-switches", name: "CUDY سويتشات" },
      { slug: "cudy-4g", name: "CUDY 4G" },
      { slug: "cudy-signal-outdoor", name: "CUDY مقويات إشارة خارجية" },
      { slug: "cudy-signal-indoor", name: "CUDY مقويات إشارة داخلية" },
    ],
  },
  {
    slug: "printers",
    name: "الطابعات",
    subs: [
      { slug: "printer-hp", name: "طابعات HP" },
      { slug: "printer-epson", name: "طابعات EPSON" },
      { slug: "printer-canon", name: "طابعات CANON" },
    ],
  },
  {
    slug: "tvs",
    name: "شاشات تلفاز LIGHTWAVE",
    subs: [
      { slug: "tv-32", name: "32 بوصة" },
      { slug: "tv-43", name: "43 بوصة" },
      { slug: "tv-50", name: "50 بوصة" },
      { slug: "tv-55", name: "55 بوصة" },
      { slug: "tv-65", name: "65 بوصة" },
      { slug: "tv-75", name: "75 بوصة" },
      { slug: "tv-85", name: "85 بوصة" },
    ],
  },
  {
    slug: "inverters",
    name: "إنفيرتر مخزن كهرباء LIGHTWAVE",
    subs: [
      { slug: "inv-10kw", name: "10KW" },
      { slug: "inv-6-2kw", name: "6.2KW" },
      { slug: "inv-3-2kw", name: "3.2KW" },
      { slug: "inv-2-2kw", name: "2.2KW" },
      { slug: "inv-1-0kw", name: "1.0KW" },
    ],
  },
  {
    slug: "batteries",
    name: "بطاريات الإنفيرتر LIGHTWAVE",
    subs: [
      { slug: "bat-100ah", name: "100AH" },
      { slug: "bat-150ah", name: "150AH" },
      { slug: "bat-200ah", name: "200AH" },
      { slug: "bat-15kw", name: "15KW" },
      { slug: "bat-17kw", name: "17KW" },
    ],
  },
  {
    slug: "accessories",
    name: "الإكسسوارات والتخزين",
    subs: [
      { slug: "headphones", name: "سماعات" },
      { slug: "flash-memory", name: "فلاش ميمري" },
      { slug: "speakers", name: "سبيكرات" },
      { slug: "hard-disks", name: "هاردسكات 2.5 و M.2" },
      { slug: "micro-memory", name: "مايكرو ميمري" },
      { slug: "usb-hubs", name: "هب USB" },
      { slug: "powerbanks", name: "باور بانك" },
    ],
  },
];

function pickImage(catSlug: string, subSlug: string): string {
  if (catSlug === "cctv") {
    if (subSlug.includes("indoor")) return IMG.cameraDome;
    if (subSlug.includes("outdoor")) return IMG.cameraOutdoor;
    if (subSlug.includes("dvr") || subSlug.includes("xvr") || subSlug.includes("nvr")) return IMG.dvr;
    if (subSlug.includes("cat6")) return IMG.cable;
    if (subSlug.includes("switch")) return IMG.switch;
    return IMG.cameraDome;
  }
  if (catSlug === "laptops") {
    if (subSlug.startsWith("gaming")) return IMG.laptopGaming;
    if (subSlug.startsWith("desktop") || subSlug.startsWith("new-desktop")) return IMG.desktop;
    if (subSlug.startsWith("aio")) return IMG.aio;
    if (subSlug.includes("mac")) return IMG.macbook;
    if (subSlug.startsWith("pos")) return IMG.pos;
    if (subSlug.includes("new-laptop")) return IMG.laptopPro;
    return IMG.laptop;
  }
  if (catSlug === "networking") {
    if (subSlug.includes("switch")) return IMG.switch;
    if (subSlug.includes("antenna") || subSlug.includes("signal") || subSlug.includes("wifi")) return IMG.antenna;
    return IMG.router;
  }
  if (catSlug === "printers") return IMG.printer;
  if (catSlug === "tvs") return IMG.tv;
  if (catSlug === "inverters") return IMG.inverter;
  if (catSlug === "batteries") return IMG.battery;
  if (catSlug === "accessories") {
    if (subSlug.includes("headphones")) return IMG.headphones;
    if (subSlug.includes("flash-memory")) return IMG.flash;
    if (subSlug.includes("speakers")) return IMG.speaker;
    if (subSlug.includes("hard-disks")) return IMG.hdd;
    if (subSlug.includes("micro-memory")) return IMG.microsd;
    if (subSlug.includes("usb-hubs")) return IMG.usbHub;
    if (subSlug.includes("powerbanks")) return IMG.powerbank;
  }
  return PLACEHOLDER;
}

function priceFor(catSlug: string, subSlug: string): { min: number; max: number } {
  if (catSlug === "cctv") {
    if (subSlug.includes("dvr") || subSlug.includes("xvr") || subSlug.includes("nvr")) return { min: 850, max: 3500 };
    if (subSlug.includes("cat6")) return { min: 180, max: 600 };
    if (subSlug.includes("switch")) return { min: 220, max: 950 };
    return { min: 130, max: 650 };
  }
  if (catSlug === "laptops") {
    if (subSlug.includes("used")) return { min: 950, max: 3200 };
    if (subSlug.includes("gaming")) return { min: 4800, max: 12000 };
    if (subSlug.includes("mac")) return { min: 5500, max: 14500 };
    if (subSlug.includes("pos")) return { min: 2200, max: 5500 };
    if (subSlug.includes("aio")) return { min: 2800, max: 6500 };
    if (subSlug.includes("desktop")) return { min: 1800, max: 5200 };
    return { min: 2400, max: 7800 };
  }
  if (catSlug === "networking") return { min: 90, max: 750 };
  if (catSlug === "printers") return { min: 380, max: 2400 };
  if (catSlug === "tvs") {
    if (subSlug === "tv-32") return { min: 950, max: 1300 };
    if (subSlug === "tv-43") return { min: 1500, max: 2100 };
    if (subSlug === "tv-50") return { min: 2100, max: 2800 };
    if (subSlug === "tv-55") return { min: 2600, max: 3400 };
    if (subSlug === "tv-65") return { min: 3800, max: 5200 };
    if (subSlug === "tv-75") return { min: 5800, max: 7800 };
    if (subSlug === "tv-85") return { min: 8500, max: 12500 };
  }
  if (catSlug === "inverters") {
    if (subSlug === "inv-10kw") return { min: 6500, max: 9500 };
    if (subSlug === "inv-6-2kw") return { min: 4200, max: 6000 };
    if (subSlug === "inv-3-2kw") return { min: 2400, max: 3500 };
    if (subSlug === "inv-2-2kw") return { min: 1700, max: 2400 };
    if (subSlug === "inv-1-0kw") return { min: 950, max: 1500 };
  }
  if (catSlug === "batteries") {
    if (subSlug === "bat-100ah") return { min: 750, max: 1100 };
    if (subSlug === "bat-150ah") return { min: 1100, max: 1600 };
    if (subSlug === "bat-200ah") return { min: 1600, max: 2200 };
    if (subSlug === "bat-15kw") return { min: 6500, max: 8500 };
    if (subSlug === "bat-17kw") return { min: 7500, max: 9800 };
  }
  if (catSlug === "accessories") {
    if (subSlug.includes("headphones") || subSlug.includes("speakers")) return { min: 60, max: 850 };
    if (subSlug.includes("powerbanks")) return { min: 95, max: 480 };
    if (subSlug.includes("hard-disks")) return { min: 220, max: 1400 };
    return { min: 35, max: 380 };
  }
  return { min: 100, max: 500 };
}

function modelNamesFor(catSlug: string, subSlug: string, brand: string): string[] {
  if (catSlug === "laptops") {
    if (subSlug.includes("used")) return [`${brand} مستعمل i5 الجيل السادس`, `${brand} مستعمل i7 الجيل السابع`, `${brand} EliteBook مستعمل`, `${brand} ProBook مستعمل`];
    if (subSlug.includes("gaming")) return [`${brand} Gaming RTX 4060`, `${brand} Gaming RTX 4070`, `${brand} Gaming Edition Pro`, `${brand} Legion ${brand === "MSI" ? "Stealth" : "Slim"}`];
    if (subSlug.includes("mac")) return ["MacBook Air M2", "MacBook Pro 14 M3", "MacBook Pro 16 M3 Max"];
    if (subSlug.includes("pos")) return [`${brand} نقطة بيع شاشة لمس`, `${brand} نظام كاشير متكامل`, `${brand} طرفية بيع مع طابعة`];
    if (subSlug.includes("aio")) return [`${brand} الكل في واحد 24"`, `${brand} الكل في واحد 27"`, `${brand} AIO Touch`];
    if (subSlug.includes("desktop")) return [`${brand} ProDesk Tower`, `${brand} OptiPlex Mini`, `${brand} ThinkCentre`];
    return [`${brand} 14 جديد i5`, `${brand} 15 جديد i7`, `${brand} 16 احترافي`, `${brand} Spectre / EliteBook`];
  }
  if (catSlug === "cctv") {
    return [`${brand} 2MP Pro`, `${brand} 4MP Starlight`, `${brand} 8MP Ultra`, `${brand} PTZ`];
  }
  if (catSlug === "networking") {
    return [`${brand} N300`, `${brand} AC1200`, `${brand} AX1800`, `${brand} Mesh`];
  }
  return [];
}

async function seed() {
  console.log("Seeding...");

  // Wipe in safe order
  await db.delete(productsTable);
  await db.delete(subcategoriesTable);
  await db.delete(categoriesTable);

  // Admin user (only insert if missing)
  const existingAdmin = await db.query.usersTable.findFirst({ where: eq(usersTable.phone, "0911234567") });
  if (!existingAdmin) {
    await db.insert(usersTable).values({
      fullName: "مدير المتجر",
      phone: "0911234567",
      region: "بنغازي",
      age: 30,
      gender: "male",
      passwordHash: hashPassword("admin1234"),
      role: "admin",
    });
  }

  // Categories + subcategories
  let catSort = 0;
  for (const cat of CATEGORIES) {
    const [c] = await db
      .insert(categoriesTable)
      .values({ slug: cat.slug, name: cat.name, sortOrder: catSort++ })
      .returning();

    let subSort = 0;
    for (const sub of cat.subs) {
      const [s] = await db
        .insert(subcategoriesTable)
        .values({ categoryId: c.id, slug: sub.slug, name: sub.name, sortOrder: subSort++ })
        .returning();

      // 4-6 products per subcategory
      const range = priceFor(cat.slug, sub.slug);
      const count = 4 + Math.floor(Math.random() * 3);
      const brand =
        sub.name.match(/HP|DELL|LENOVO|ACER|ASUS|MAC|MSI|DAHUA|IMOU|TP-LINK|TPLINK|CUDY|EPSON|CANON|LIGHTWAVE/i)?.[0] ??
        "";
      const models = modelNamesFor(cat.slug, sub.slug, brand);
      for (let i = 0; i < count; i++) {
        const baseName = models[i % Math.max(1, models.length)] ?? sub.name;
        const name = models.length > 0 ? `${baseName}` : `${sub.name} - الإصدار ${i + 1}`;
        const price = Math.round((range.min + Math.random() * (range.max - range.min)) / 5) * 5;
        const stock = Math.floor(Math.random() * 18) + 2;
        const description = `${sub.name} • منتج أصلي بضمان • جودة عالية • متوفر للتسليم في كافة المناطق الليبية`;
        await db.insert(productsTable).values({
          subcategoryId: s.id,
          name: `${name} ${i + 1}`,
          description,
          price: price.toFixed(2),
          imageUrl: pickImage(cat.slug, sub.slug),
          stock,
        });
      }
    }
  }

  console.log("Done.");
  await pool.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
