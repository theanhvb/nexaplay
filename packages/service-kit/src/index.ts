import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import pg from "pg";

// Shared runtime primitives used by every backend service.

const { Pool } = pg;
const scrypt = promisify(scryptCallback);

export type UserRole = "user" | "admin" | "super_admin" | "content_editor" | "support";
export type Identity = { userId: string; profileId: string; role: UserRole; sessionId: string };

export function createPool(fallbackDatabase: string) {
  return new Pool(process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_SIZE ?? 10),
    idleTimeoutMillis: 30_000
  } : {
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "12345",
    database: fallbackDatabase,
    max: Number(process.env.DB_POOL_SIZE ?? 10),
    idleTimeoutMillis: 30_000
  });
}

export function ok<T>(res: Response, data: T, meta: Record<string, unknown> | null = null, status = 200) {
  return res.status(status).json({ success: true, data, meta, error: null });
}

export function fail(res: Response, status: number, code: string, message: string, details?: unknown) {
  return res.status(status).json({ success: false, data: null, meta: null, error: { code, message, ...(details ? { details } : {}) } });
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => void fn(req, res, next).catch(next);
}

export function identity(req: Request): Identity | null {
  const userId = req.header("x-user-id");
  const profileId = req.header("x-profile-id");
  const role = req.header("x-user-role");
  const sessionId = req.header("x-session-id");
  const roles: UserRole[] = ["user", "admin", "super_admin", "content_editor", "support"];
  return userId && profileId && sessionId && roles.includes(role as UserRole) ? { userId, profileId, role: role as UserRole, sessionId } : null;
}

export function requireIdentity(req: Request, res: Response, next: NextFunction) {
  if (!identity(req)) return fail(res, 401, "UNAUTHORIZED", "Authentication is required");
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!(["admin", "super_admin", "content_editor", "support"] as UserRole[]).includes(identity(req)?.role as UserRole)) return fail(res, 403, "FORBIDDEN", "Admin role is required");
  next();
}

export function requireRoles(...allowed: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const actor = identity(req);
    if (!actor) return fail(res, 401, "UNAUTHORIZED", "Authentication is required");
    // Legacy `admin` users retain Super Admin access during the RBAC migration.
    if (actor.role !== "admin" && !allowed.includes(actor.role)) return fail(res, 403, "FORBIDDEN", "You do not have permission to perform this action");
    next();
  };
}

type JwtPayload = Identity & { exp: number; iat: number };
const b64 = (value: string | Buffer) => Buffer.from(value).toString("base64url");

export function signJwt(payload: Omit<JwtPayload, "iat" | "exp">, ttlSeconds = 900) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds }));
  const content = `${header}.${body}`;
  const signature = createHmac("sha256", process.env.JWT_SECRET ?? "local-dev-change-this-secret").update(content).digest("base64url");
  return `${content}.${signature}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return null;
  const expected = createHmac("sha256", process.env.JWT_SECRET ?? "local-dev-change-this-secret").update(`${header}.${body}`).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as JwtPayload;
    return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch { return null; }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [, salt, digest] = stored.split("$");
  if (!salt || !digest || !stored.startsWith("scrypt$")) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(digest, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const opaqueToken = () => randomBytes(32).toString("base64url");
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export function errorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(error);
  fail(res, 500, "INTERNAL_SERVER_ERROR", "An unexpected service error occurred");
}

export function health(service: string, pool: pg.Pool) {
  return asyncHandler(async (_req, res) => {
    await pool.query("SELECT 1");
    ok(res, { service, status: "ok", uptime: process.uptime() });
  });
}
