import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const vehicleSchema = new Schema({
    vin: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 17,
        maxlength: 17
    },
    brand: {
        type: String,
        required: true,
        maxlength: 100
    },
    model: {
        type: String,
        required: true,
        maxlength: 100
    },
    manufacture_year: {
        type: Number,
        required: true
    },
    color: String,
    battery_capacity: Number,
    registration_number: String,
    customer_id: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    purchase_date: Date,
    warranty_start: {
        type: Date,
        required: true
    },
    warranty_end: {
        type: Date,
        required: true
    },
    warranty_status: {
        type: String,
        enum: ['valid', 'expired', 'void'],
        default: 'valid'
    },
    current_mileage: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['active', 'sold', 'inactive', 'recalled'],
        default: 'active'
    },
    notes: String
}, {
    timestamps: true
});
// Custom validator cho date range
vehicleSchema.pre('validate', function (next) {
    if (this.warranty_end && this.warranty_start && this.warranty_end <= this.warranty_start) {
        next(new Error('warranty_end phải sau warranty_start'));
    }
    next();
});

// Index để tìm kiếm nhanh 
vehicleSchema.index({ vin: 1 });
vehicleSchema.index({ customer_id: 1 });

const Vehicle = model('Vehicle', vehicleSchema);

export default Vehicle;