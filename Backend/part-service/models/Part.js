import mongoose from "mongoose";

const { Schema, model } = mongoose;

const partSchema = new Schema(
  {
    serial_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      required: true,
      enum: ["battery", "motor", "bms", "charger", "inverter", "sensor"],
    },
    manufacturer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    model: {
      type: String,
      default: [],
    },
    cost_price: {
      type: Number,
      default: 0,
      min: 0,
    },
    weight_kg: {
      type: Number,
      default: 0,
      min: 0,
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
    description: {
      type: String,
      trim: true,
    },
    image_url: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "discontinued", "out_of_stock"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Index để tìm kiếm nhanh
partSchema.index({ part_id: 1 }, { unique: true });
partSchema.index({ category: 1 });
partSchema.index({ manufacturer: 1 });
partSchema.index({ status: 1 });

const Part = model("Part", partSchema);

export default Part;
