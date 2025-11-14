import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const shipmentSchema = new Schema({
  shipment_code: {
    type: String,
    required: true,
    trim: true
  },
  claim_id: {
    type: Schema.Types.ObjectId,
    ref: 'WarrantyClaim'
  },
  from_location_id: {
    type: String,
    required: true,
    trim: true
  },
  to_location_id: {
    type: String,
    required: true,
    trim: true
  },
  parts_list: [{
    part_id: {
      type: String,
      required: true,
      ref: 'Part'
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  }],
  ship_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  delivery_date: {
    type: Date
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending'
  },
  tracking_number: {
    type: String,
    trim: true
  },
  carrier: {
    type: String,
    trim: true
  },
  cost: {
    type: Number,
    min: 0,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index cho tìm kiếm nhanh
shipmentSchema.index({ shipment_code: 1 }, { unique: true });
shipmentSchema.index({ status: 1 });
shipmentSchema.index({ to_location_id: 1, status: 1 });
shipmentSchema.index({ claim_id: 1 });

const Shipment = model('Shipment', shipmentSchema);

export default Shipment;