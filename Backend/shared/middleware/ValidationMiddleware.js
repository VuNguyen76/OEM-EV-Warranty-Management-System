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
            .withMessage('Password phải ít nhất 6 ký tự')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),
        
        body('role')
            .optional()
            .isIn(['admin', 'service_staff', 'technician', 'manufacturer_staff', 'customer'])
            .withMessage('Role không hợp lệ')
    ],

    // User login validation
    login: [
        body('email')
            .isEmail()
            .withMessage('Email không hợp lệ')
            .normalizeEmail(),
        
        body('password')
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
            .matches(/^[0-9+\-\s()]+$/)
            .withMessage('Số điện thoại không hợp lệ'),
        
        body('role')
            .optional()
            .isIn(['admin', 'service_staff', 'technician', 'manufacturer_staff', 'customer'])
            .withMessage('Role không hợp lệ')
    ],

    // Vehicle registration validation
    vehicleRegister: [
        body('vin')
            .isLength({ min: 17, max: 17 })
            .withMessage('VIN phải có đúng 17 ký tự')
            .matches(/^[A-HJ-NPR-Z0-9]{17}$/)
            .withMessage('VIN không hợp lệ (không chứa I, O, Q)'),
        
        body('make')
            .trim()
            .notEmpty()
            .withMessage('Hãng xe không được để trống'),
        
        body('model')
            .trim()
            .notEmpty()
            .withMessage('Model xe không được để trống'),
        
        body('year')
            .isInt({ min: 2000, max: new Date().getFullYear() + 1 })
            .withMessage('Năm sản xuất không hợp lệ'),
        
        body('ownerEmail')
            .isEmail()
            .withMessage('Email chủ xe không hợp lệ')
            .normalizeEmail(),
        
        body('ownerPhone')
            .matches(/^[0-9+\-\s()]+$/)
            .withMessage('Số điện thoại chủ xe không hợp lệ')
    ]
};

module.exports = {
    validate,
    validationRules
};
