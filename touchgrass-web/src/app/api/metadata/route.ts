// app/api/metadata/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "@/utils/config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("body info ", body);

    const metadata = {
      title: body.title || body.name,
      location: body.location,
      time: body.time,
      description: body.description,
      image: body.image,
    };

    console.log("meta info ", metadata);

    const { cid } = await pinata.upload.public.json(metadata);

    // Return ipfs:// format for contract compatibility
    const ipfsUri = `ipfs://${cid}`;
    const gatewayUri = await pinata.gateways.public.convert(cid);

    console.log("Metadata IPFS URI:", ipfsUri);
    console.log("Metadata Gateway URI:", gatewayUri);

    return NextResponse.json(
      {
        uri: ipfsUri, // Primary URI for contract
        gatewayUri, // Alternative for viewing
        cid,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Metadata upload failed", e);
    return NextResponse.json(
      { error: "Metadata upload failed" },
      { status: 500 }
    );
  }
}
