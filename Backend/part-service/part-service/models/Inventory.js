
import mongoose from "mongoose";
import PartCatalog from "./PartCatalog.js";

const { Schema, model } = mongoose;

const inventorySchema = new Schema(
  {
    part_catalog_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PartCatalog",
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    threshold: {
      type: Number,
      default: 3,
      min: 0,
    },
    last_updated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index cho tìm kiếm nhanh
inventorySchema.index({ quantity: 1 });
inventorySchema.index({ last_updated: 1 });

const Inventory = model("Inventory", inventorySchema);

export default Inventory;
