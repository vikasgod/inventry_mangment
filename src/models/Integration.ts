import mongoose, { Schema, models, model } from "mongoose";

const IntegrationSchema = new Schema(
    {
        provider: {
            type: String,
            required: true,
            enum: [
                "Amazon",
                "Flipkart",
                "Meesho",
                "Website",
                "Shiprocket",
                "Razorpay",
                "WhatsApp",
            ],
            unique: true,
        },
        category: {
            type: String,
            enum: ["Marketplace", "Website", "Shipping", "Payment", "Communication"],
            required: true,
        },
        accountName: {
            type: String,
            default: "",
            trim: true,
        },
        storeUrl: {
            type: String,
            default: "",
            trim: true,
        },
        sellerId: {
            type: String,
            default: "",
            trim: true,
        },
        status: {
            type: String,
            enum: ["Not Connected", "Configured", "Error"],
            default: "Not Connected",
        },
        syncEnabled: {
            type: Boolean,
            default: false,
        },
        lastSyncAt: {
            type: Date,
            default: null,
        },
        lastActivity: {
            type: String,
            default: "No activity yet",
        },
        activity: [
            {
                message: { type: String },
                type: {
                    type: String,
                    enum: ["Info", "Success", "Warning", "Error"],
                    default: "Info",
                },
                createdAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

const Integration =
    models.Integration || model("Integration", IntegrationSchema);

export default Integration;