import { Schema, model, Document, Types } from "mongoose";

export type UserRole = "ORG_ADMIN" | "SECURITY_ANALYST" | "SUPER_ADMIN";

export interface UserDocument extends Document {
  organizationId: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["ORG_ADMIN", "SECURITY_ANALYST", "SUPER_ADMIN"],
      default: "SECURITY_ANALYST",
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    twoFactorEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UserModel = model<UserDocument>("User", userSchema);