/**
 * VIN Mixin - Reusable VIN field with validation
 * Used across Vehicle, WarrantyClaim, WarrantyActivation models
 * 
 * ✅ Uses shared VINConstants for consistent validation
 */

const { validateVINFormat } = require('../constants/VINConstants');

const VINMixin = {
    vin: {
        type: String,
        required: [true, 'VIN is required'],
        uppercase: true,
        trim: true,
        minlength: [17, 'VIN must be exactly 17 characters'],
        maxlength: [17, 'VIN must be exactly 17 characters'],
        validate: {
            validator: function (v) {
                // Use shared validation from VINConstants
                const validation = validateVINFormat(v);
                return validation.valid;
            },
            message: props => {
                const validation = validateVINFormat(props.value);
                return validation.error || 'VIN must be exactly 17 characters (excluding I, O, Q)';
            }
        }
    }
};

module.exports = {
    VINMixin
};