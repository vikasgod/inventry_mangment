import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { authorizeAdmin } from "@/lib/auth";
import { permissions } from "@/lib/permissions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const authorization = await authorizeAdmin();
  if (authorization) return authorization;

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid operator ID." }, { status: 400 });
  }

  const body = await request.json();
  const selectedPermissions: unknown = body.permissions;
  if (
    !Array.isArray(selectedPermissions) ||
    selectedPermissions.some((permission) => !permissions.includes(permission))
  ) {
    return NextResponse.json({ message: "Select valid operator permissions." }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOneAndUpdate(
    { _id: id, role: "operator" },
    { permissions: [...new Set(selectedPermissions)] },
    { new: true, runValidators: true }
  )
    .select("username permissions")
    .lean();

  if (!user) {
    return NextResponse.json({ message: "Operator not found." }, { status: 404 });
  }

  return NextResponse.json({ message: "Permissions updated.", user });
}
