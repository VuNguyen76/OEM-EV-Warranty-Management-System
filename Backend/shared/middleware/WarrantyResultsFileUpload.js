const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { responseHelper } = require('../utils/responseHelper');

/**
 * File Upload Middleware cho Warranty Results
 * Chỉ cho phép upload ảnh với validation chặt chẽ
 */

// Tạo thư mục uploads cho warranty results
const createUploadDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created upload directory: ${dir}`);
    }
};

// Storage configuration cho result photos
const warrantyResultStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads/warranty-results');
        createUploadDir(uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Format: WR_claimId_timestamp_originalname
        const claimId = req.params.claimId || 'unknown';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        // Sanitize filename
        const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `WR_${claimId}_${timestamp}_${sanitizedName}${ext}`;
        cb(null, filename);
    }
});

// File filter - CHỈ cho phép ảnh
const imageFilter = (req, file, cb) => {
    // Chỉ cho phép ảnh
    const allowedImageTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png'
    ];

    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    // Kiểm tra MIME type và extension
    if (allowedImageTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error(`Chỉ cho phép file ảnh (jpg, jpeg, png). File "${file.originalname}" không được phép.`), false);
    }
};

// Multer configuration cho warranty results
const uploadResultPhotos = multer({
    storage: warrantyResultStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 10 // Tối đa 10 files mỗi lần upload
    }
});

// Middleware cho upload multiple result photos
const uploadMultipleResultPhotos = uploadResultPhotos.array('photos', 10);

// Enhanced error handling cho warranty results
const handleWarrantyResultsUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return responseHelper.error(res, 'File ảnh quá lớn. Kích thước tối đa là 10MB.', 400);
            case 'LIMIT_FILE_COUNT':
                return responseHelper.error(res, 'Quá nhiều file ảnh. Tối đa 10 ảnh mỗi lần upload.', 400);
            case 'LIMIT_UNEXPECTED_FILE':
                return responseHelper.error(res, 'Field name không đúng. Sử dụng "photos".', 400);
            default:
                return responseHelper.error(res, `Lỗi upload ảnh: ${error.message}`, 400);
        }
    } else if (error) {
        return responseHelper.error(res, `${error.message}`, 400);
    }
    next();
};

// Kiểm tra dữ liệu middleware cho result photos
const validateResultPhotos = (req, res, next) => {
    // Kiểm tra có files không
    if (!req.files || req.files.length === 0) {
        return responseHelper.error(res, 'Phải upload ít nhất 1 ảnh kết quả', 400);
    }

    // Kiểm tra descriptions
    const descriptions = req.body.descriptions;
    if (!descriptions) {
        return responseHelper.error(res, 'Phải cung cấp mô tả cho mỗi ảnh', 400);
    }

    // Parse descriptions nếu là string
    let parsedDescriptions;
    try {
        parsedDescriptions = typeof descriptions === 'string' ? JSON.parse(descriptions) : descriptions;
    } catch (error) {
        return responseHelper.error(res, 'Format mô tả ảnh không hợp lệ', 400);
    }

    // Kiểm tra số lượng descriptions phải bằng số files
    if (!Array.isArray(parsedDescriptions) || parsedDescriptions.length !== req.files.length) {
        return responseHelper.error(res, 'Số lượng mô tả phải bằng số lượng ảnh', 400);
    }

    // Validate từng description
    for (let i = 0; i < parsedDescriptions.length; i++) {
        const desc = parsedDescriptions[i];
        if (!desc || typeof desc !== 'string' || desc.trim().length === 0) {
            return responseHelper.error(res, `Mô tả ảnh thứ ${i + 1} không được để trống`, 400);
        }
        if (desc.trim().length > 500) {
            return responseHelper.error(res, `Mô tả ảnh thứ ${i + 1} quá dài (tối đa 500 ký tự)`, 400);
        }
    }

    // Lưu parsed descriptions vào req để controller sử dụng
    req.parsedDescriptions = parsedDescriptions;
    next();
};

// Utility function để tạo file URL cho warranty results
const generateResultPhotoUrl = (req, filename) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/uploads/warranty-results/${filename}`;
};

// Utility function để xóa result photo
const deleteResultPhoto = (filepath) => {
    try {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            console.log(`Deleted result photo: ${filepath}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error deleting result photo ${filepath}:`, error);
        return false;
    }
};

// Cleanup function để xóa files khi có lỗi
const cleanupUploadedFiles = (files) => {
    if (!files || !Array.isArray(files)) return;
    
    files.forEach(file => {
        if (file.path) {
            deleteResultPhoto(file.path);
        }
    });
};

module.exports = {
    uploadMultipleResultPhotos,
    handleWarrantyResultsUploadError,
    validateResultPhotos,
    generateResultPhotoUrl,
    deleteResultPhoto,
    cleanupUploadedFiles,
    createUploadDir
};
