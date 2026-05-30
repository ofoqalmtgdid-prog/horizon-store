import crypto from "node:crypto";
import { type Request, type Response, type NextFunction } from "express";
import { db, sessionsTable, usersTable, type DbUser } from "@workspace/db";
import { eq } from "drizzle-orm";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function newSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function readToken(req: Request): string | null {
  const auth = req.header("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const headerToken = req.header("x-session-token");
  if (headerToken) return headerToken.trim();
  return null;
}

export async function loadUser(req: Request): Promise<DbUser | null> {
  const token = readToken(req);
  if (!token) return null;
  const session = await db.query.sessionsTable.findFirst({
    where: eq(sessionsTable.token, token),
  });
  if (!session) return null;
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, session.userId),
  });
  return user ?? null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      currentUser?: DbUser;
    }
  }
}

export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await loadUser(req);
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    req.currentUser = user;
    next();
  };
}

export function requireAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await loadUser(req);
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (user.role !== "admin") {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    req.currentUser = user;
    next();
  };
}

export function publicUser(u: DbUser) {
  return {
    id: u.id,
    fullName: u.fullName,
    phone: u.phone,
    region: u.region,
    age: u.age,
    gender: u.gender,
    role: u.role,
    avatarUrl: u.avatarUrl ?? null,
    walletBalance: Number(u.walletBalance ?? 0),
    createdAt: u.createdAt.toISOString(),
  };
}
