import { connectDB } from "@/lib/mongodb";
import Clique from "@/models/Clique";
import { NextResponse, NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params;
  const { members } = await req.json();

  if (!Array.isArray(members)) {
    return NextResponse.json({ error: "Invalid members" }, { status: 400 });
  }

  try {
    const clique = await Clique.findById(id);
    if (!clique) {
      return NextResponse.json({ error: "Clique not found" }, { status: 404 });
    }

    // Add new members (avoid duplicates)
    const uniqueMembers = Array.from(new Set([...clique.members, ...members]));

    clique.members = uniqueMembers;
    await clique.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding members:", error);
    return NextResponse.json(
      { error: "Failed to add members" },
      { status: 500 }
    );
  }
}
