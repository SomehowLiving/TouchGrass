import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Clique from "@/models/Clique";

export async function POST(req: NextRequest) {
  await connectDB();

  const { name, walletAddress } = await req.json();

  if (!name || !walletAddress) {
    return NextResponse.json(
      { error: "Missing name or wallet" },
      { status: 400 }
    );
  }

  const newClique = await Clique.create({
    name,
    creator: walletAddress,
    members: [walletAddress],
    isActive: false,
  });

  return NextResponse.json({ clique: newClique }, { status: 201 });
}

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get("walletAddress");

  if (!walletAddress) {
    return NextResponse.json(
      { error: "walletAddress is required" },
      { status: 400 }
    );
  }

  const cliques = await Clique.find({
    $or: [{ creator: walletAddress }, { members: walletAddress }],
  });

  return NextResponse.json({ cliques });
}
