import { createHmac, timingSafeEqual, scrypt as scryptCallback, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import type { Permission } from "@/lib/permissions";

const SESSION_COOKIE = "inventory_session";
const SESSION_SECONDS = 60 * 60 * 8;

export class AuthConfigurationError extends Error {}

export type AuthenticatedUser = {
  _id: unknown;
  username: string;
  role: "admin" | "operator";
  permissions: string[];
  isActive: boolean;
};

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new AuthConfigurationError("SESSION_SECRET must be set to a random value of at least 32 characters.");
  }
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string) {
  const payload = `${userId}.${Math.floor(Date.now() / 1000) + SESSION_SECONDS}`;
  return `${payload}.${sign(payload)}`;
}

async function hashPassword(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await hashPassword(password, salt);
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, hashHex] = storedHash.split(":");
  if (!salt || !hashHex || !/^[a-f0-9]{128}$/i.test(hashHex)) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await hashPassword(password, salt);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function verifySessionToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, expiration, signature] = parts;
  const payload = `${userId}.${expiration}`;
  const expected = Buffer.from(sign(payload));
  const supplied = Buffer.from(signature);

  if (
    !userId ||
    !/^\d+$/.test(expiration) ||
    Number(expiration) <= Math.floor(Date.now() / 1000) ||
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  ) {
    return null;
  }

  return userId;
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = verifySessionToken(token);
  if (!userId) return null;

  await connectDB();
  const user = await User.findById(userId)
    .select("username role permissions isActive")
    .lean<AuthenticatedUser | null>();

  return user?.isActive ? user : null;
}

export async function authorizeRequest(permission?: Permission) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  if (permission && user.role !== "admin" && !user.permissions.includes(permission)) {
    return NextResponse.json({ message: "You do not have access to this section." }, { status: 403 });
  }

  return null;
}

export async function authorizeAdmin() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ message: "Administrator access required." }, { status: 403 });
  }

  return null;
}

export function setSessionCookie(response: NextResponse, userId: string) {
  response.cookies.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export async function bootstrapAdmin() {
  await connectDB();
  if (await User.exists({ role: "admin" })) return;

  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    throw new AuthConfigurationError("Configure ADMIN_USERNAME and ADMIN_PASSWORD to create the first admin account.");
  }
  if (username.length < 3 || password.length < 10) {
    throw new AuthConfigurationError("ADMIN_USERNAME must be at least 3 characters and ADMIN_PASSWORD at least 10 characters.");
  }

  try {
    await User.create({
      username,
      passwordHash: await createPasswordHash(password),
      role: "admin",
      permissions: [],
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    if (!(await User.exists({ role: "admin" }))) throw error;
  }
}
