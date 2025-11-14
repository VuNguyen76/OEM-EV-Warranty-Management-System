import mongoose from "mongoose";

const { Schema, model } = mongoose;

const partCatalogSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    category: {
      type: String,
      required: true,
      enum: ["battery", "motor", "bms", "charger", "inverter", "sensor"],
    },
    manufacturer: { type: String, required: true, trim: true, maxlength: 100 },
    model_code: { type: String, required: true, trim: true }, // Ví dụ: BAT60V-30A

    cost_price: { type: Number, default: 0, min: 0 },
    weight_kg: { type: Number, default: 0, min: 0 },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
    description: { type: String, trim: true },
    image_url: { type: String, trim: true },
    status: {
      type: String,
      enum: ["active", "discontinued", "out_of_stock"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Index nhanh theo model_code
partCatalogSchema.index({ model_code: 1 }, { unique: true });
partCatalogSchema.index({ category: 1 });

const PartCatalog = model("PartCatalog", partCatalogSchema);
export default PartCatalog;
