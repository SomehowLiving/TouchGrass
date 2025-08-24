// app/api/pinata/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const metadata = await req.json();

    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PINATA_JWT}`, // from Pinata
      },
      body: JSON.stringify(metadata),
    });

    const data = await res.json();

    return NextResponse.json({
      ipfsHash: data.IpfsHash,
      uri: `ipfs://${data.IpfsHash}`,
    });
  } catch (err: any) {
    console.error("Pinata upload failed:", err);
    return NextResponse.json(
      { error: "Pinata upload failed" },
      { status: 500 }
    );
  }
}
