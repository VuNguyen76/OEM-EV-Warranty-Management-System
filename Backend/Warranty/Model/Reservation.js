const mongoose = require('mongoose');
const { getWarrantyConnection } = require('../../shared/database/warrantyConnection');

const reservationSchema = new mongoose.Schema({
    partId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Part',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    reservedBy: {
        type: String,
        required: true
    },
    reservedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'expired', 'cancelled'],
        default: 'active'
    },
    relatedServiceHistoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceHistory'
    },
    notes: String
}, {
    timestamps: true
});

// Indexes
reservationSchema.index({ partId: 1, status: 1 });
reservationSchema.index({ expiresAt: 1, status: 1 });
reservationSchema.index({ reservedBy: 1 });

// Static methods
reservationSchema.statics.createReservation = async function(partId, quantity, reservedBy, expirationMinutes = 30) {
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
    
    const reservation = new this({
        partId,
        quantity,
        reservedBy,
        expiresAt
    });
    
    return await reservation.save();
};

reservationSchema.statics.releaseExpiredReservations = async function() {
    const Part = require('./Part')();
    
    const expiredReservations = await this.find({
        status: 'active',
        expiresAt: { $lt: new Date() }
    });
    
    let releasedCount = 0;
    
    for (const reservation of expiredReservations) {
        try {
            // Release stock back to part
            const part = await Part.findById(reservation.partId);
            if (part) {
                part.reservedQuantity = Math.max(0, part.reservedQuantity - reservation.quantity);
                await part.save();
            }
            
            // Mark reservation as expired
            reservation.status = 'expired';
            await reservation.save();
            
            releasedCount++;
        } catch (error) {
            console.error(`❌ Error releasing reservation ${reservation._id}:`, error);
        }
    }
    
    if (releasedCount > 0) {
        console.log(`✅ Released ${releasedCount} expired stock reservations`);
    }
    
    return releasedCount;
};

reservationSchema.statics.completeReservation = async function(reservationId) {
    const reservation = await this.findById(reservationId);
    if (!reservation || reservation.status !== 'active') {
        throw new Error('Reservation không tồn tại hoặc đã được xử lý');
    }
    
    reservation.status = 'completed';
    return await reservation.save();
};

reservationSchema.statics.cancelReservation = async function(reservationId) {
    const Part = require('./Part')();
    
    const reservation = await this.findById(reservationId);
    if (!reservation || reservation.status !== 'active') {
        throw new Error('Reservation không tồn tại hoặc đã được xử lý');
    }
    
    // Release stock back to part
    const part = await Part.findById(reservation.partId);
    if (part) {
        part.reservedQuantity = Math.max(0, part.reservedQuantity - reservation.quantity);
        await part.save();
    }
    
    reservation.status = 'cancelled';
    return await reservation.save();
};

// Export factory function
module.exports = function createReservation() {
    const warrantyConnection = getWarrantyConnection();
    return warrantyConnection.model('Reservation', reservationSchema);
};
