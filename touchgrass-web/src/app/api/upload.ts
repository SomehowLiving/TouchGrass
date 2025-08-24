// pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { file } = req.body; // base64 or remote URL

    const uploadRes = await cloudinary.v2.uploader.upload(file, {
      folder: "touch-grass",
      resource_type: "auto", // supports image, video, etc.
    });

    return res.status(200).json({
      url: uploadRes.secure_url,
      publicId: uploadRes.public_id,
    });
  } catch (err: any) {
    console.error("Cloudinary upload failed:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
}
