import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  console.log("MongoDB connected");
}

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});
