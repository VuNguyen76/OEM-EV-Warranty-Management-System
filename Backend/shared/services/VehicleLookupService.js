const axios = require('axios');

class VehicleLookupService {
    constructor() {
        this.vehicleServiceUrl = process.env.VEHICLE_SERVICE_URL || 'http://warranty_vehicle_service:3004';
    }

    /**
     * Tìm xe bị ảnh hưởng theo tiêu chí recall
     * @param {Object} criteria - Tiêu chí tìm kiếm
     * @param {string} authToken - JWT token for authentication
     * @returns {Array} Danh sách xe bị ảnh hưởng
     */
    async findAffectedVehicles(criteria, authToken = null) {
        try {
            const vehicles = await this.getAllVehicles(authToken);
            let affectedVehicles = [];

            // Check if we have any filtering criteria
            const hasModels = criteria.models && criteria.models.length > 0;
            const hasVinRanges = criteria.vinRanges && criteria.vinRanges.length > 0;
            const hasProductionDateRange = criteria.productionDateRange &&
                (criteria.productionDateRange.from || criteria.productionDateRange.to);
            const hasSpecificVINs = criteria.specificVINs && criteria.specificVINs.length > 0;

            // If only specificVINs, start with those
            if (hasSpecificVINs && !hasModels && !hasVinRanges && !hasProductionDateRange) {
                affectedVehicles = vehicles.filter(vehicle =>
                    criteria.specificVINs.includes(vehicle.vin)
                );
            } else {
                // Start with all vehicles for other criteria
                affectedVehicles = vehicles;

                // Filter by models
                if (hasModels) {
                    affectedVehicles = affectedVehicles.filter(vehicle =>
                        criteria.models.includes(vehicle.model)
                    );
                }

                // Filter by VIN ranges
                if (hasVinRanges) {
                    affectedVehicles = affectedVehicles.filter(vehicle => {
                        return criteria.vinRanges.some(range => {
                            return vehicle.vin >= range.from && vehicle.vin <= range.to;
                        });
                    });
                }

                // Filter by production date range
                if (hasProductionDateRange) {
                    const { from, to } = criteria.productionDateRange;
                    affectedVehicles = affectedVehicles.filter(vehicle => {
                        const productionDate = new Date(vehicle.productionDate);
                        let inRange = true;

                        if (from) {
                            inRange = inRange && productionDate >= new Date(from);
                        }
                        if (to) {
                            inRange = inRange && productionDate <= new Date(to);
                        }

                        return inRange;
                    });
                }

                // Include specific VINs (merge with existing results)
                if (hasSpecificVINs) {
                    const specificVehicles = vehicles.filter(vehicle =>
                        criteria.specificVINs.includes(vehicle.vin)
                    );

                    // Merge with existing results (remove duplicates)
                    const existingVINs = new Set(affectedVehicles.map(v => v.vin));
                    specificVehicles.forEach(vehicle => {
                        if (!existingVINs.has(vehicle.vin)) {
                            affectedVehicles.push(vehicle);
                        }
                    });
                }
            }

            // Exclude specific VINs
            if (criteria.excludedVINs && criteria.excludedVINs.length > 0) {
                affectedVehicles = affectedVehicles.filter(vehicle =>
                    !criteria.excludedVINs.includes(vehicle.vin)
                );
            }

            // Enrich with service center information
            const enrichedVehicles = await this.enrichWithServiceCenterInfo(affectedVehicles);

            return enrichedVehicles;

        } catch (error) {
            console.error('Error finding affected vehicles:', error);
            throw new Error('Không thể tìm xe bị ảnh hưởng: ' + error.message);
        }
    }

    /**
     * Lấy tất cả xe từ Vehicle Service
     * @param {string} authToken - JWT token for authentication
     * @returns {Array} Danh sách tất cả xe
     */
    async getAllVehicles(authToken = null) {
        try {
            const headers = {};
            if (authToken) {
                headers.Authorization = `Bearer ${authToken}`;
            }

            const response = await axios.get(`${this.vehicleServiceUrl}/`, {
                timeout: 10000,
                headers
            });

            if (response.data.success) {
                return response.data.data.vehicles || [];
            } else {
                throw new Error('Vehicle service returned error: ' + response.data.message);
            }
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Không thể kết nối đến Vehicle Service');
            }
            throw error;
        }
    }

    /**
     * Lấy thông tin xe theo VIN
     * @param {string} vin - VIN của xe
     * @returns {Object} Thông tin xe
     */
    async getVehicleByVIN(vin) {
        try {
            const response = await axios.get(`${this.vehicleServiceUrl}/vehicles/vin/${vin}`, {
                timeout: 5000
            });

            if (response.data.success) {
                return response.data.data.vehicle;
            } else {
                return null;
            }
        } catch (error) {
            console.error(`Error getting vehicle by VIN ${vin}:`, error);
            return null;
        }
    }

    /**
     * Bổ sung thông tin service center cho danh sách xe
     * @param {Array} vehicles - Danh sách xe
     * @returns {Array} Danh sách xe đã bổ sung thông tin service center
     */
    async enrichWithServiceCenterInfo(vehicles) {
        // For now, we'll assign a default service center based on location
        // In a real system, this would query a service center database
        return vehicles.map(vehicle => ({
            vin: vehicle.vin,
            model: vehicle.model,
            productionDate: vehicle.productionDate,
            serviceCenterId: this.getDefaultServiceCenterId(vehicle),
            serviceCenterName: this.getDefaultServiceCenterName(vehicle),
            status: 'pending'
        }));
    }

    /**
     * Lấy service center ID mặc định dựa trên vị trí xe
     * @param {Object} vehicle - Thông tin xe
     * @returns {string} Service center ID
     */
    getDefaultServiceCenterId(vehicle) {
        // Simple logic based on VIN or other criteria
        // In real system, this would be more sophisticated
        if (!vehicle.vin) {
            return '507f1f77bcf86cd799439012'; // Default service center
        }
        const vinPrefix = vehicle.vin.substring(0, 3);

        switch (vinPrefix) {
            case 'LVG': // VinFast VF8
                return '507f1f77bcf86cd799439011'; // HCMC Service Center
            case 'LVH': // VinFast VF9
                return '507f1f77bcf86cd799439012'; // Hanoi Service Center
            default:
                return '507f1f77bcf86cd799439013'; // Default Service Center
        }
    }

    /**
     * Lấy tên service center mặc định
     * @param {Object} vehicle - Thông tin xe
     * @returns {string} Tên service center
     */
    getDefaultServiceCenterName(vehicle) {
        if (!vehicle.vin) {
            return 'Default Service Center';
        }
        const vinPrefix = vehicle.vin.substring(0, 3);

        switch (vinPrefix) {
            case 'LVG':
                return 'VinFast Service HCMC';
            case 'LVH':
                return 'VinFast Service Hanoi';
            default:
                return 'VinFast Service Center';
        }
    }

    /**
     * Thống kê xe theo model
     * @param {Array} vehicles - Danh sách xe
     * @returns {Object} Thống kê theo model
     */
    getStatisticsByModel(vehicles) {
        const stats = {};
        vehicles.forEach(vehicle => {
            const model = vehicle.model || 'Unknown';
            stats[model] = (stats[model] || 0) + 1;
        });
        return stats;
    }

    /**
     * Thống kê xe theo service center
     * @param {Array} vehicles - Danh sách xe
     * @returns {Object} Thống kê theo service center
     */
    getStatisticsByServiceCenter(vehicles) {
        const stats = {};
        vehicles.forEach(vehicle => {
            const centerName = vehicle.serviceCenterName || 'Unknown';
            stats[centerName] = (stats[centerName] || 0) + 1;
        });
        return stats;
    }

    /**
     * Validate VIN format
     * @param {string} vin - VIN cần validate
     * @returns {boolean} True nếu VIN hợp lệ
     */
    isValidVIN(vin) {
        if (!vin || typeof vin !== 'string') return false;
        return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
    }

    /**
     * Validate VIN range
     * @param {Object} range - VIN range {from, to}
     * @returns {boolean} True nếu range hợp lệ
     */
    isValidVINRange(range) {
        if (!range || !range.from || !range.to) return false;
        return this.isValidVIN(range.from) &&
            this.isValidVIN(range.to) &&
            range.from <= range.to;
    }

    /**
     * Validate production date range
     * @param {Object} range - Date range {from, to}
     * @returns {boolean} True nếu range hợp lệ
     */
    isValidDateRange(range) {
        if (!range) return true; // Optional field

        const from = range.from ? new Date(range.from) : null;
        const to = range.to ? new Date(range.to) : null;

        if (from && isNaN(from.getTime())) return false;
        if (to && isNaN(to.getTime())) return false;
        if (from && to && from >= to) return false;

        return true;
    }

    /**
     * Validate affected criteria
     * @param {Object} criteria - Tiêu chí tìm kiếm
     * @returns {Object} {valid: boolean, errors: Array}
     */
    validateCriteria(criteria) {
        const errors = [];

        // Check if at least one criteria is provided
        const hasModels = criteria.models && criteria.models.length > 0;
        const hasVINRanges = criteria.vinRanges && criteria.vinRanges.length > 0;
        const hasDateRange = criteria.productionDateRange &&
            (criteria.productionDateRange.from || criteria.productionDateRange.to);
        const hasSpecificVINs = criteria.specificVINs && criteria.specificVINs.length > 0;

        if (!hasModels && !hasVINRanges && !hasDateRange && !hasSpecificVINs) {
            errors.push('Phải có ít nhất một tiêu chí để tìm xe bị ảnh hưởng');
        }

        // Validate VIN ranges
        if (criteria.vinRanges) {
            criteria.vinRanges.forEach((range, index) => {
                if (!this.isValidVINRange(range)) {
                    errors.push(`VIN range ${index + 1} không hợp lệ`);
                }
            });
        }

        // Validate production date range
        if (!this.isValidDateRange(criteria.productionDateRange)) {
            errors.push('Khoảng thời gian sản xuất không hợp lệ');
        }

        // Validate specific VINs
        if (criteria.specificVINs) {
            criteria.specificVINs.forEach((vin, index) => {
                if (!this.isValidVIN(vin)) {
                    errors.push(`VIN cụ thể ${index + 1} không hợp lệ: ${vin}`);
                }
            });
        }

        // Validate excluded VINs
        if (criteria.excludedVINs) {
            criteria.excludedVINs.forEach((vin, index) => {
                if (!this.isValidVIN(vin)) {
                    errors.push(`VIN loại trừ ${index + 1} không hợp lệ: ${vin}`);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

module.exports = VehicleLookupService;
