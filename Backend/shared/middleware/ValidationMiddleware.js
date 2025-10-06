const { body, validationResult } = require('express-validator');

// Reusable validation middleware
const validate = (validations) => {
    return async (req, res, next) => {
        // Run all validations in parallel
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        // Return standardized error response
        return res.status(400).json({
            success: false,
            message: "Dữ liệu không hợp lệ",
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }))
        });
    };
};

// Common validation rules
const validationRules = {
    // User registration validation
    register: [
        body('username')
            .trim()
            .isLength({ min: 3, max: 30 })
            .withMessage('Username phải từ 3-30 ký tự')
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage('Username chỉ chứa chữ, số và dấu gạch dưới'),

        body('email')
            .isEmail()
            .withMessage('Email không hợp lệ')
            .normalizeEmail(),

        body('password')
            .isLength({ min: 6 })
            .withMessage('Password phải ít nhất 6 ký tự'),

        body('role')
            .optional()
            .isIn(['admin', 'service_staff', 'technician', 'manufacturer_staff', 'customer'])
            .withMessage('Role không hợp lệ')
    ],

    // User login validation
    login: [
        body('email')
            .trim()
            .escape()
            .isEmail()
            .withMessage('Email không hợp lệ')
            .normalizeEmail(),

        body('password')
            .trim()
            .notEmpty()
            .withMessage('Password không được để trống')
    ],

    // User update validation
    updateUser: [
        body('username')
            .optional()
            .trim()
            .isLength({ min: 3, max: 30 })
            .withMessage('Username phải từ 3-30 ký tự'),

        body('email')
            .optional()
            .isEmail()
            .withMessage('Email không hợp lệ')
            .normalizeEmail(),

        body('phone')
            .optional()
            .isLength({ min: 10, max: 15 })
            .withMessage('Số điện thoại phải từ 10-15 ký tự'),

        body('role')
            .optional()
            .isIn(['admin', 'service_staff', 'technician', 'manufacturer_staff', 'customer'])
            .withMessage('Role không hợp lệ'),

        // Full address validation for customer role
        body('fullAddress')
            .custom((value, { req }) => {
                if (req.body.role === 'customer') {
                    if (!value) {
                        throw new Error('Địa chỉ đầy đủ là bắt buộc cho customer');
                    }
                    if (value.length < 10) {
                        throw new Error('Địa chỉ phải ít nhất 10 ký tự');
                    }
                }
                return true;
            })
    ],

    // Vehicle registration validation - Simplified
    vehicleRegister: [
        body('vin')
            .trim()
            .isLength({ min: 10, max: 20 })
            .withMessage('VIN phải từ 10-20 ký tự'),

        body('manufacturer')
            .trim()
            .notEmpty()
            .withMessage('Hãng xe không được để trống'),

        body('modelName')
            .trim()
            .notEmpty()
            .withMessage('Tên model không được để trống'),

        body('year')
            .isInt({ min: 2000, max: new Date().getFullYear() + 2 })
            .withMessage('Năm sản xuất không hợp lệ'),

        body('ownerName')
            .trim()
            .notEmpty()
            .withMessage('Tên chủ xe không được để trống')
    ]
};

module.exports = {
    validate,
    validationRules
};
