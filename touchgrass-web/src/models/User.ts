import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true },
  email: { type: String, unique: true },
  username: String,
  avatar: String,
  joinedAt: Date,
});

export default mongoose.models.User || mongoose.model("User", userSchema);
