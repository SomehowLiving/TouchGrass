// src/app/api/plan/clique/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Plan from "@/models/Plan"; // Ensure you have this model defined

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id: cliqueId } = await params;

  if (!cliqueId) {
    return NextResponse.json(
      { error: "Clique ID is required" },
      { status: 400 }
    );
  }

  try {
    const plan = await Plan.findOne({ cliqueId });

    if (!plan) {
      return NextResponse.json(
        { error: "No plan found for this clique" },
        { status: 404 }
      );
    }

    return NextResponse.json({ plan }, { status: 200 });
  } catch (error) {
    console.error("Error fetching plan by cliqueId:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
