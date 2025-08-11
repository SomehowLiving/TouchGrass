import mongoose from "mongoose";

const cliqueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  creator: { type: String, required: true }, // walletAddress
  members: [String], // array of wallet addresses
  isActive: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Clique || mongoose.model("Clique", cliqueSchema);
