import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

// GET method to fetch all users for the add members modal
export async function GET(req: Request) {
  await connectDB();

  try {
    const users = await User.find(
      {},
      {
        walletAddress: 1,
        email: 1,
        username: 1,
        avatar: 1,
        _id: 1,
      }
    ).sort({ joinedAt: -1 }); // Sort by newest first

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// Your existing POST method
export async function POST(req: Request) {
  await connectDB();
  const { walletAddress, email } = await req.json();

  if (!walletAddress || !email) {
    return NextResponse.json(
      { error: "Missing wallet or email" },
      { status: 400 }
    );
  }

  // Check for existing wallet address
  let user = await User.findOne({ walletAddress });
  if (user) {
    return NextResponse.json({ user });
  }

  // Check for existing email
  const existingEmailUser = await User.findOne({ email });
  if (existingEmailUser) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  // Create new user
  user = await User.create({
    walletAddress,
    email,
    joinedAt: new Date(),
  });

  return NextResponse.json({ user });
}
