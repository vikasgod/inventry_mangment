import { NextResponse } from "next/server";
import { ZodError } from "zod";
import mongoose from "mongoose";

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request", details: error.issues }, { status: 400 });
  }
  if (error instanceof mongoose.Error.ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof mongoose.Error.CastError) {
    return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
  }
  if (error && typeof error === "object" && "code" in error && error.code === 11000) {
    return NextResponse.json({ error: "A record with this unique value already exists" }, { status: 409 });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
