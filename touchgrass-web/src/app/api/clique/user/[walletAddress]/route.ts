import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Clique from "@/models/Clique";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ walletAddress: string }> }
) {
  await connectDB();

  const { walletAddress } = await params;

  if (!walletAddress) {
    return NextResponse.json(
      { error: "Wallet address is required" },
      { status: 400 }
    );
  }

  try {
    const cliques = await Clique.find({ creator: walletAddress });
    return NextResponse.json({ cliques }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch cliques" },
      { status: 500 }
    );
  }
}
