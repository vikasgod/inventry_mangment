import { NextRequest, NextResponse } from "next/server";
import { authorizeAdmin, createPasswordHash } from "@/lib/auth";
import { permissions } from "@/lib/permissions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await authorizeAdmin();
  if (authorization) return authorization;

  await connectDB();
  const users = await User.find({ role: "operator" })
    .select("username permissions isActive createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdmin();
  if (authorization) return authorization;

  try {
    const body = await request.json();
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    const selectedPermissions: unknown = body.permissions;

    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      return NextResponse.json(
        { message: "Username must be 3-32 characters using letters, numbers, dots, underscores or hyphens." },
        { status: 400 }
      );
    }

    if (password.length < 10) {
      return NextResponse.json({ message: "Password must be at least 10 characters." }, { status: 400 });
    }

    if (
      !Array.isArray(selectedPermissions) ||
      selectedPermissions.some((permission) => !permissions.includes(permission))
    ) {
      return NextResponse.json({ message: "Select valid operator permissions." }, { status: 400 });
    }

    await connectDB();
    const user = await User.create({
      username,
      passwordHash: await createPasswordHash(password),
      role: "operator",
      permissions: [...new Set(selectedPermissions)],
    });

    return NextResponse.json(
      {
        message: "Operator account created.",
        user: { _id: user._id, username: user.username, permissions: user.permissions },
      },
      { status: 201 }
    );
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ message: "That username is already in use." }, { status: 409 });
    }
    console.error("Creating operator failed:", error);
    return NextResponse.json({ message: "Unable to create operator account." }, { status: 500 });
  }
}
