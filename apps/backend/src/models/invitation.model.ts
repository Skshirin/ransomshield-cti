import { Schema, model, Document, Types } from "mongoose";

export interface InvitationDocument extends Document {
  code: string;
  organizationId: Types.ObjectId;
  createdBy: Types.ObjectId;
  isConsumed: boolean;
  consumedBy?: Types.ObjectId;
  consumedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<InvitationDocument>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isConsumed: {
      type: Boolean,
      default: false,
    },
    consumedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    consumedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export const InvitationModel = model<InvitationDocument>("Invitation", invitationSchema);
