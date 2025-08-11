// app/api/files/route.ts

import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "@/utils/config";

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file = data.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No valid file found" },
        { status: 400 }
      );
    }

    console.log("File received:", file);
    console.log("Uploading to Pinata...");

    const { cid } = await pinata.upload.public.file(file as File);
    console.log("CID returned:", cid);

    const url = pinata.gateways.public.convert(cid);
    return NextResponse.json({ url }, { status: 200 });
  } catch (e) {
    console.error("Pinata upload failed", e);
    return NextResponse.json(
      { error: "Pinata upload failed" },
      { status: 500 }
    );
  }
}
