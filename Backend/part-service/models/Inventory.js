import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  part_id: {
    type: String,
    required: true,
    ref: 'Part',
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  threshold: {
    type: Number,
    default: 3
  },
  last_restocked_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

inventorySchema.index({ part_id: 1 });

const Inventory = mongoose.model('Inventory', inventorySchema);

export default Inventory;