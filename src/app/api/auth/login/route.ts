import { NextRequest, NextResponse } from "next/server";
import {
  AuthConfigurationError,
  bootstrapAdmin,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json({ message: "Username and password are required." }, { status: 400 });
    }

    await bootstrapAdmin();
    await connectDB();

    const user = await User.findOne({ username, isActive: true }).select("+passwordHash");
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
    }

    const response = NextResponse.json({
      user: {
        username: user.username,
        role: user.role,
        permissions: user.permissions,
      },
    });
    setSessionCookie(response, String(user._id));
    return response;
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      {
        message:
          error instanceof AuthConfigurationError
            ? error.message
            : "Unable to sign in.",
      },
      { status: error instanceof AuthConfigurationError ? 503 : 500 }
    );
  }
}
