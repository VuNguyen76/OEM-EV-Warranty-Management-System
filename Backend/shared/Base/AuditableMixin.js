/**
 * Auditable Mixin - Reusable audit fields
 * Extends BaseEntity with user tracking
 */

const AuditableMixin = {
    createdBy: {
        type: String,
        required: true,
        trim: true
    },

    updatedBy: {
        type: String,
        trim: true
    },

    createdByRole: {
        type: String,
        required: true,
        enum: ['admin', 'service_staff', 'technician', 'manufacturer_staff']
    },

    updatedByRole: {
        type: String,
        enum: ['admin', 'service_staff', 'technician', 'manufacturer_staff']
    }
};

module.exports = {
    AuditableMixin
};