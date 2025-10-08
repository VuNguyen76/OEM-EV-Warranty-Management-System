const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Multer Middleware cho file upload
 * Hỗ trợ upload nhiều loại file cho warranty claims
 */

// Tạo thư mục uploads nếu chưa có
const createUploadDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created upload directory: ${dir}`);
    }
};

// Cấu hình storage cho warranty claims
const warrantyClaimStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads/warranty-claims');
        createUploadDir(uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Định dạng: claimId_timestamp_originalname
        const claimId = req.params.claimId || 'unknown';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        const filename = `${claimId}_${timestamp}_${nameWithoutExt}${ext}`;
        cb(null, filename);
    }
});

// File filter - chỉ cho phép các loại file an toàn
const fileFilter = (req, file, cb) => {
    // Loại file được phép
    const allowedTypes = [
        // Images
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv',
        // Video (cho video kiểm tra)
        'video/mp4',
        'video/avi',
        'video/mov',
        'video/wmv'
    ];

    const allowedExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.webp',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', 
        '.txt', '.csv', '.mp4', '.avi', '.mov', '.wmv'
    ];

    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`), false);
    }
};

// Cấu hình multer cho warranty claims
const uploadWarrantyClaimFiles = multer({
    storage: warrantyClaimStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB mỗi file
        files: 10 // Tối đa 10 files mỗi lần upload
    }
});

// Middleware cho upload nhiều files
const uploadMultipleFiles = uploadWarrantyClaimFiles.array('files', 10);

// Middleware cho upload single file
const uploadSingleFile = uploadWarrantyClaimFiles.single('file');

// Xử lý lỗi middleware
const handleMulterError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    message: 'File quá lớn. Kích thước tối đa là 50MB.',
                    error: 'FILE_TOO_LARGE'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    message: 'Quá nhiều file. Tối đa 10 files mỗi lần upload.',
                    error: 'TOO_MANY_FILES'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    message: 'Field name không đúng. Sử dụng "files" hoặc "file".',
                    error: 'UNEXPECTED_FIELD'
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Lỗi upload file.',
                    error: error.message
                });
        }
    } else if (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
            error: 'FILE_FILTER_ERROR'
        });
    }
    next();
};

// Utility function để tạo file URL
const generateFileUrl = (req, filename) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/uploads/warranty-claims/${filename}`;
};

// Utility function để xóa file
const deleteFile = (filepath) => {
    try {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            console.log(`Deleted file: ${filepath}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error deleting file ${filepath}:`, error);
        return false;
    }
};

module.exports = {
    uploadMultipleFiles,
    uploadSingleFile,
    handleMulterError,
    generateFileUrl,
    deleteFile,
    createUploadDir
};
