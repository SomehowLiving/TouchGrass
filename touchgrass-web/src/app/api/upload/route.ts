import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const { file } = await req.json(); // expects base64 string

    const uploadRes = await cloudinary.uploader.upload(file, {
      folder: "clique-memories",
      resource_type: "auto",
    });

    return NextResponse.json({
      url: uploadRes.secure_url,
      publicId: uploadRes.public_id,
    });
  } catch (err: any) {
    console.error("Cloudinary upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// Optional: quick GET route to check API works in browser
export async function GET() {
  return NextResponse.json({ status: "✅ Upload API is working" });
}
