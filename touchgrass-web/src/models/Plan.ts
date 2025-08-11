// models/Plan.ts
import mongoose, { Schema, models } from "mongoose";

const PlanSchema = new Schema({
  planTitle: String,
  location: String,
  time: String,
  vibeCheck: String,
  isPublic: Boolean,
  isClique: Boolean,
  creator: String,
  cliqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Clique",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Plan = models.Plan || mongoose.model("Plan", PlanSchema);
export default Plan;
