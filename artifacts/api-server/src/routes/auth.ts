import { Router, type IRouter } from "express";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody, RegisterBody } from "@workspace/api-zod";
import { hashPassword, verifyPassword, newSessionToken, requireAuth, publicUser, readToken } from "../lib/auth";
import { UpdateProfileBody } from "@workspace/api-zod";
import { OAuth2Client } from "google-auth-library";

const router: IRouter = Router();

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", errors: parsed.error.issues });
    return;
  }
  const { fullName, phone, region, age, gender, password } = parsed.data;

  const existing = await db.query.usersTable.findFirst({ where: eq(usersTable.phone, phone) });
  if (existing) {
    res.status(409).json({ message: "رقم الهاتف مسجل بالفعل" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      fullName,
      phone,
      region,
      age,
      gender,
      passwordHash: hashPassword(password),
      role: "customer",
    })
    .returning();

  const token = newSessionToken();
  await db.insert(sessionsTable).values({ token, userId: user.id });

  res.json({ user: publicUser(user), token });
});

router.post("/auth/login", async (req, res) => {
  const { phone, password, email } = req.body as { phone?: string; password?: string; email?: string };
  const identifier = email || phone || "";
  if (!identifier || !password) {
    res.status(400).json({ message: "بيانات غير مكتملة" });
    return;
  }

  let user;
  if (identifier.includes("@")) {
    user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, identifier) });
  } else {
    user = await db.query.usersTable.findFirst({ where: eq(usersTable.phone, identifier) });
  }

  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ message: "البيانات غير صحيحة، تحقق من البريد/الهاتف وكلمة المرور" });
    return;
  }

  const token = newSessionToken();
  await db.insert(sessionsTable).values({ token, userId: user.id });
  res.json({ user: publicUser(user), token });
});

router.post("/auth/register-email", async (req, res) => {
  const { fullName, email, password } = req.body as { fullName?: string; email?: string; password?: string };
  if (!fullName || !email || !password) {
    res.status(400).json({ message: "الاسم والبريد وكلمة المرور مطلوبة" });
    return;
  }
  if (!email.includes("@")) {
    res.status(400).json({ message: "البريد الإلكتروني غير صالح" });
    return;
  }
  if (password.length < 4) {
    res.status(400).json({ message: "كلمة المرور يجب أن تكون 4 أحرف على الأقل" });
    return;
  }

  const existing = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
  if (existing) {
    res.status(409).json({ message: "البريد الإلكتروني مسجل بالفعل" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      fullName,
      email,
      phone: null,
      region: "طرابلس",
      age: 18,
      gender: "male",
      passwordHash: hashPassword(password),
      role: "customer",
    })
    .returning();

  const token = newSessionToken();
  await db.insert(sessionsTable).values({ token, userId: user.id });
  res.json({ user: publicUser(user), token });
});

router.get("/auth/me", requireAuth(), async (req, res) => {
  res.json(publicUser(req.currentUser!));
});

router.post("/auth/logout", async (req, res) => {
  const token = readToken(req);
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.json({ ok: true });
});

router.post("/auth/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential || typeof credential !== "string") {
    res.status(400).json({ message: "credential مطلوب" });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(500).json({ message: "Google Sign-In غير مُهيأ" });
    return;
  }

  let payload: { sub?: string; email?: string; name?: string } | null = null;
  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload() ?? null;
  } catch {
    res.status(401).json({ message: "رمز Google غير صالح" });
    return;
  }

  if (!payload?.sub) {
    res.status(401).json({ message: "رمز Google غير صالح" });
    return;
  }

  const googleId = payload.sub;
  const email = payload.email ?? null;
  const fullName = payload.name ?? "مستخدم Google";

  let user = await db.query.usersTable.findFirst({
    where: eq(usersTable.googleId, googleId),
  });

  if (!user && email) {
    user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });
    if (user) {
      await db.update(usersTable).set({ googleId }).where(eq(usersTable.id, user.id));
    }
  }

  if (!user) {
    const placeholderPhone = `g_${googleId.slice(0, 16)}`;
    [user] = await db
      .insert(usersTable)
      .values({
        fullName,
        phone: placeholderPhone,
        region: "طرابلس",
        age: 18,
        gender: "male",
        passwordHash: null,
        role: "customer",
        googleId,
        email,
      })
      .returning();
  }

  const token = newSessionToken();
  await db.insert(sessionsTable).values({ token, userId: user.id });
  res.json({ user: publicUser(user), token });
});

router.put("/profile", requireAuth(), async (req, res) => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  const userId = req.currentUser!.id;
  const updates: Record<string, unknown> = {};
  if (parsed.data.fullName !== undefined) updates.fullName = parsed.data.fullName;
  if (parsed.data.region !== undefined) updates.region = parsed.data.region;
  if (parsed.data.avatarUrl !== undefined) updates.avatarUrl = parsed.data.avatarUrl;
  if (parsed.data.password !== undefined) updates.passwordHash = hashPassword(parsed.data.password);

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
  res.json(publicUser(updated));
});

export default router;
