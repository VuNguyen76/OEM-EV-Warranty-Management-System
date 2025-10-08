/**
 * ServiceCenter Mixin - Reusable service center fields
 * Used across Vehicle, WarrantyClaim, WarrantyActivation models
 */
const mongoose = require('mongoose');

const ServiceCenterMixin = {
    serviceCenterId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'ServiceCenter'
    },

    serviceCenterName: {
        type: String,
        required: true,
        trim: true
    },

    serviceCenterCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    }
};

module.exports = {
    ServiceCenterMixin
};