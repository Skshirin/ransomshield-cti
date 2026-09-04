import { Schema, model, Document, Types } from "mongoose";

export type ActionType = "ISOLATE" | "UNISOLATE";
export type ActionStatus = "PENDING" | "SENT" | "ACKNOWLEDGED" | "COMPLETED" | "FAILED";

export interface EndpointActionDocument extends Document {
  organizationId: Types.ObjectId;
  endpointId: Types.ObjectId;
  actionType: ActionType;
  status: ActionStatus;
  reason?: string;
  requestedByUserId?: Types.ObjectId;
  requestedAt: Date;
  executedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const endpointActionSchema = new Schema<EndpointActionDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    endpointId: {
      type: Schema.Types.ObjectId,
      ref: "Endpoint",
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: ["ISOLATE", "UNISOLATE"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SENT", "ACKNOWLEDGED", "COMPLETED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    reason: { type: String },
    requestedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    executedAt: { type: Date },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

// Compound index for fast lookup of pending actions per endpoint
endpointActionSchema.index({ endpointId: 1, status: 1, createdAt: -1 });

export const EndpointActionModel = model<EndpointActionDocument>(
  "EndpointAction",
  endpointActionSchema
);
