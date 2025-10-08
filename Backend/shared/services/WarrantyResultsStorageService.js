const fs = require('fs');
const path = require('path');

/**
 * Storage Service cho Warranty Results
 * Quản lý lưu trữ ảnh kết quả bảo hành
 */

class WarrantyResultsStorageService {
    constructor() {
        this.baseUploadDir = path.join(__dirname, '../../uploads/warranty-results');
        this.ensureUploadDirExists();
    }

    /**
     * Đảm bảo thư mục upload tồn tại
     */
    ensureUploadDirExists() {
        if (!fs.existsSync(this.baseUploadDir)) {
            fs.mkdirSync(this.baseUploadDir, { recursive: true });
            console.log(`WarrantyResultsStorageService: Created upload directory: ${this.baseUploadDir}`);
        }
    }

    /**
     * Lưu thông tin ảnh vào database
     * @param {Array} files - Array of uploaded files
     * @param {Array} descriptions - Array of descriptions
     * @param {String} userId - ID của user upload
     * @param {Object} req - Request object để tạo URL
     * @returns {Array} Array of photo objects
     */
    processUploadedPhotos(files, descriptions, userId, req) {
        if (!files || !Array.isArray(files) || files.length === 0) {
            throw new Error('Không có file nào được upload');
        }

        if (!descriptions || !Array.isArray(descriptions) || descriptions.length !== files.length) {
            throw new Error('Số lượng mô tả phải bằng số lượng ảnh');
        }

        const photoObjects = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const description = descriptions[i];

            // Validate file
            if (!file.filename || !file.path) {
                throw new Error(`File thứ ${i + 1} không hợp lệ`);
            }

            // Validate description
            if (!description || typeof description !== 'string' || description.trim().length === 0) {
                throw new Error(`Mô tả ảnh thứ ${i + 1} không được để trống`);
            }

            // Tạo URL cho ảnh
            const photoUrl = this.generatePhotoUrl(req, file.filename);

            // Tạo photo object
            const photoObject = {
                url: photoUrl,
                description: description.trim(),
                uploadedAt: new Date(),
                uploadedBy: userId,
                // Metadata
                _filename: file.filename,
                _originalName: file.originalname,
                _size: file.size,
                _mimetype: file.mimetype
            };

            photoObjects.push(photoObject);
        }

        return photoObjects;
    }

    /**
     * Tạo URL cho ảnh
     * @param {Object} req - Request object
     * @param {String} filename - Tên file
     * @returns {String} URL của ảnh
     */
    generatePhotoUrl(req, filename) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        return `${baseUrl}/uploads/warranty-results/${filename}`;
    }

    /**
     * Xóa ảnh khỏi storage
     * @param {String} filename - Tên file cần xóa
     * @returns {Boolean} True nếu xóa thành công
     */
    deletePhoto(filename) {
        try {
            const filepath = path.join(this.baseUploadDir, filename);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                console.log(`WarrantyResultsStorageService: Deleted photo: ${filename}`);
                return true;
            } else {
                console.warn(`WarrantyResultsStorageService: Photo not found: ${filename}`);
                return false;
            }
        } catch (error) {
            console.error(`WarrantyResultsStorageService: Error deleting photo ${filename}:`, error);
            return false;
        }
    }

    /**
     * Xóa nhiều ảnh
     * @param {Array} filenames - Array tên files cần xóa
     * @returns {Object} Kết quả xóa
     */
    deleteMultiplePhotos(filenames) {
        if (!filenames || !Array.isArray(filenames)) {
            return { success: 0, failed: 0, errors: [] };
        }

        const result = {
            success: 0,
            failed: 0,
            errors: []
        };

        filenames.forEach(filename => {
            if (this.deletePhoto(filename)) {
                result.success++;
            } else {
                result.failed++;
                result.errors.push(`Failed to delete: ${filename}`);
            }
        });

        return result;
    }

    /**
     * Cleanup files khi có lỗi
     * @param {Array} files - Array of uploaded files
     */
    cleanupUploadedFiles(files) {
        if (!files || !Array.isArray(files)) return;

        files.forEach(file => {
            if (file.filename) {
                this.deletePhoto(file.filename);
            }
        });
    }

    /**
     * Kiểm tra file có tồn tại không
     * @param {String} filename - Tên file
     * @returns {Boolean} True nếu file tồn tại
     */
    fileExists(filename) {
        const filepath = path.join(this.baseUploadDir, filename);
        return fs.existsSync(filepath);
    }

    /**
     * Lấy thông tin file
     * @param {String} filename - Tên file
     * @returns {Object|null} Thông tin file hoặc null nếu không tồn tại
     */
    getFileInfo(filename) {
        try {
            const filepath = path.join(this.baseUploadDir, filename);
            if (fs.existsSync(filepath)) {
                const stats = fs.statSync(filepath);
                return {
                    filename: filename,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    modifiedAt: stats.mtime,
                    path: filepath
                };
            }
            return null;
        } catch (error) {
            console.error(`WarrantyResultsStorageService: Error getting file info for ${filename}:`, error);
            return null;
        }
    }

    /**
     * Validate uploaded files
     * @param {Array} files - Array of uploaded files
     * @returns {Object} Validation result
     */
    validateUploadedFiles(files) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        if (!files || !Array.isArray(files) || files.length === 0) {
            result.valid = false;
            result.errors.push('Không có file nào được upload');
            return result;
        }

        // Kiểm tra số lượng files
        if (files.length > 10) {
            result.valid = false;
            result.errors.push('Tối đa 10 ảnh mỗi lần upload');
            return result;
        }

        // Validate từng file
        files.forEach((file, index) => {
            // Kiểm tra kích thước file (10MB)
            if (file.size > 10 * 1024 * 1024) {
                result.valid = false;
                result.errors.push(`Ảnh thứ ${index + 1} quá lớn (tối đa 10MB)`);
            }

            // Kiểm tra loại file
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedTypes.includes(file.mimetype)) {
                result.valid = false;
                result.errors.push(`Ảnh thứ ${index + 1} không đúng định dạng (chỉ cho phép jpg, jpeg, png)`);
            }

            // Kiểm tra file có được upload thành công không
            if (!file.filename || !file.path) {
                result.valid = false;
                result.errors.push(`Ảnh thứ ${index + 1} upload không thành công`);
            }
        });

        return result;
    }

    /**
     * Lấy tổng dung lượng đã sử dụng
     * @returns {Number} Dung lượng tính bằng bytes
     */
    getTotalStorageUsed() {
        try {
            let totalSize = 0;
            const files = fs.readdirSync(this.baseUploadDir);
            
            files.forEach(filename => {
                const filepath = path.join(this.baseUploadDir, filename);
                const stats = fs.statSync(filepath);
                totalSize += stats.size;
            });

            return totalSize;
        } catch (error) {
            console.error('WarrantyResultsStorageService: Error calculating storage usage:', error);
            return 0;
        }
    }

    /**
     * Format dung lượng thành string dễ đọc
     * @param {Number} bytes - Dung lượng tính bằng bytes
     * @returns {String} Dung lượng đã format
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Export singleton instance
module.exports = new WarrantyResultsStorageService();
