import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Plan from "@/models/Plan";
import Clique from "@/models/Clique";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      planTitle,
      location,
      time,
      vibeCheck,
      isPublic,
      isClique,
      cliqueId,
      creator,
    } = body;

    if (!creator || !planTitle || !cliqueId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newPlan = await Plan.create({
      planTitle: planTitle,
      location,
      time,
      vibeCheck,
      isPublic,
      isClique,
      creator,
      cliqueId,
      createdAt: new Date(),
    });

    await Clique.findByIdAndUpdate(cliqueId, { isActive: true });

    return NextResponse.json({ success: true, plan: newPlan });
  } catch (error: any) {
    console.error("Plan POST error:", error.message);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
