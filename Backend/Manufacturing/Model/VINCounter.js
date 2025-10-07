const mongoose = require('mongoose');
const { getManufacturingConnection } = require('../../shared/database/manufacturingConnection');

/**
 * VIN Counter Schema
 * Tracks sequential numbers for VIN generation per manufacturer/model/year/plant
 */
const VINCounterSchema = new mongoose.Schema({
    manufacturerCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        maxlength: 3
    },

    modelCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },

    modelYear: {
        type: Number,
        required: true,
        min: 2020,
        max: 2050
    },

    plantCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        maxlength: 1
    },

    currentSequence: {
        type: Number,
        default: 0,
        min: 0
    },

    lastGenerated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'vin_counters'
});

// Compound unique index to ensure one counter per combination
VINCounterSchema.index({
    manufacturerCode: 1,
    modelCode: 1,
    modelYear: 1,
    plantCode: 1
}, { unique: true });

// Index for queries
VINCounterSchema.index({ lastGenerated: -1 });

// Static method to get next sequence number (atomic operation)
VINCounterSchema.statics.getNextSequence = async function (manufacturerCode, modelCode, modelYear, plantCode) {
    const counter = await this.findOneAndUpdate(
        {
            manufacturerCode: manufacturerCode.toUpperCase(),
            modelCode: modelCode.toUpperCase(),
            modelYear: modelYear,
            plantCode: plantCode.toUpperCase()
        },
        {
            $inc: { currentSequence: 1 },
            $set: { lastGenerated: new Date() }
        },
        {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }
    );

    return counter.currentSequence;
};

// Static method to reset counter (for testing or new production cycle)
VINCounterSchema.statics.resetCounter = async function (manufacturerCode, modelCode, modelYear, plantCode) {
    return this.findOneAndUpdate(
        {
            manufacturerCode: manufacturerCode.toUpperCase(),
            modelCode: modelCode.toUpperCase(),
            modelYear: modelYear,
            plantCode: plantCode.toUpperCase()
        },
        {
            $set: {
                currentSequence: 0,
                lastGenerated: new Date()
            }
        },
        { new: true }
    );
};

// Export factory function
module.exports = function createVINCounter() {
    const manufacturingConnection = getManufacturingConnection();
    return manufacturingConnection.model('VINCounter', VINCounterSchema);
};
