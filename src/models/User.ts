import { model, models, Schema } from "mongoose";
import { permissions } from "@/lib/permissions";

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 32,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["admin", "operator"],
      default: "operator",
      required: true,
    },
    permissions: {
      type: [String],
      enum: permissions,
      default: [],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = models.User || model("User", UserSchema);

export default User;
