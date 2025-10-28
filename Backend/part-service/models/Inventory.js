import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const inventorySchema = new Schema({
  part_id: {
    type: String,
    required: true,
    ref: 'Part',
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  threshold: {
    type: Number,
    default: 3,
    min: 0
  },
  last_restocked_at: {
    type: Date
  }
}, {
  timestamps: true
});

// Index cho tìm kiếm nhanh
inventorySchema.index({ part_id: 1 }, { unique: true });
inventorySchema.index({ quantity: 1 });

const Inventory = model('Inventory', inventorySchema);

export default Inventory;