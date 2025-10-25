import mongoose from 'mongoose';


const partSchema = new mongoose.Schema({
  part_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['battery', 'motor', 'bms', 'charger', 'inverter', 'sensor']
  },
  manufacturer: {
    type: String,
    required: true
  },
  model_compatible: {
    type: [String], 
    required: true,
    default: [] 
  }
  ,
  warranty_policy_code: {
    type: String,
    default: null
  },
  cost_price: {
    type: Number,
    default: 0
  },
  weight_kg: {
    type: Number,
    default: 0
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  description: {
    type: String,
    default: ''
  },
  image_url: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'discontinued', 'out_of_stock'],
    default: 'active'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});
const Parrt = mongoose.model('Part', partSchema);

export default Parrt;