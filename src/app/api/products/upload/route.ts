
import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";

const MAX_FILES = 8;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("images");

    if (!files.length) {
      return NextResponse.json(
        { message: "At least one image is required." },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { message: `Maximum ${MAX_FILES} images are allowed.` },
        { status: 400 }
      );
    }

    const uploaded = [];

    for (const item of files) {
      if (!(item instanceof File) || item.size === 0) continue;

      if (!["image/jpeg", "image/png", "image/webp"].includes(item.type)) {
        return NextResponse.json(
          { message: "Only JPG, PNG and WebP images are allowed." },
          { status: 400 }
        );
      }

      if (item.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { message: "Each image must be 5 MB or smaller." },
          { status: 400 }
        );
      }

      const bytes = Buffer.from(await item.arrayBuffer());
      const dataUri = `data:${item.type};base64,${bytes.toString("base64")}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        folder: "inventory-crm/products",
        resource_type: "image",
      });

      uploaded.push({
        url: result.secure_url,
        publicId: result.public_id,
      });
    }

    if (!uploaded.length) {
      return NextResponse.json(
        { message: "No valid images were uploaded." },
        { status: 400 }
      );
    }

    return NextResponse.json({ images: uploaded }, { status: 201 });
  } catch (error) {
    console.error("Product image upload failed:", error);

    return NextResponse.json(
      { message: "Image upload failed. Check Cloudinary configuration." },
      { status: 500 }
    );
  }
}
