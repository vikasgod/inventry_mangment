import { Schema, model, models } from "mongoose";

const AuditLogSchema = new Schema({
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: String,
  details: { type: Schema.Types.Mixed, default: {} },
  actor: { type: String, default: "system" },
}, { timestamps: true });

export default models.AuditLog || model("AuditLog", AuditLogSchema);
