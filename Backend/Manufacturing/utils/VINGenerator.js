/**
 * VIN Generator Utility - ISO 3779 Compliant
 * Generates Vehicle Identification Numbers according to international standards
 * Uses shared VIN constants to maintain consistency
 */

const { WMI_CODES, YEAR_CODES, PLANT_CODES, WMI_REVERSE, YEAR_REVERSE, PLANT_REVERSE, validateVINFormat } = require('../../shared/constants/VINConstants');

class VINGenerator {

    /**
     * Encode Vehicle Descriptor Section (VDS) - 5 characters
     * @param {Object} vehicleModel - Vehicle model information
     * @returns {string} 5-character VDS
     */
    static encodeVDS(vehicleModel) {
        // Ký tự 1: Loại xe
        const typeMap = {
            'sedan': 'S',
            'suv': 'U',
            'hatchback': 'H',
            'coupe': 'C',
            'wagon': 'W',
            'truck': 'T',
            'van': 'V'
        };
        const type = typeMap[vehicleModel.category?.toLowerCase()] || 'X';

        // Ký tự 2: Dung lượng pin (mã hóa)
        const batteryCode = Math.min(9, Math.floor((vehicleModel.batteryCapacity || 50) / 10));

        // Ký tự 3: Công suất motor (mã hóa)
        const motorPower = vehicleModel.motorPower || 200;
        const motorCode = motorPower > 400 ? '9' :
            motorPower > 300 ? '7' :
                motorPower > 200 ? '5' :
                    motorPower > 100 ? '3' : '1';

        // Ký tự 4-5: Phiên bản/mức trang bị
        const variantMap = {
            'base': 'BA',
            'plus': 'PL',
            'premium': 'PR',
            'luxury': 'LX',
            'sport': 'SP',
            'eco': 'EC'
        };
        const variant = variantMap[vehicleModel.variant?.toLowerCase()] || 'ST'; // Standard

        return `${type}${batteryCode}${motorCode}${variant}`;
    }

    /**
     * Calculate VIN check digit (position 9)
     * @param {string} vin17 - 17-character VIN with 'X' at position 9
     * @returns {string} Check digit (0-9 or X)
     */
    static calculateCheckDigit(vin17) {
        const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
        const values = {
            'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
            'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
            'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
            '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
        };

        let sum = 0;
        for (let i = 0; i < 17; i++) {
            if (i === 8) continue; // Bỏ qua vị trí check digit
            const char = vin17[i];
            if (values[char] === undefined) {
                throw new Error(`Invalid character '${char}' at position ${i + 1}`);
            }
            sum += values[char] * weights[i];
        }

        const remainder = sum % 11;
        return remainder === 10 ? 'X' : remainder.toString();
    }

    /**
     * Generate a complete VIN
     * @param {Object} vehicleModel - Vehicle model information
     * @param {string} plantCode - Manufacturing plant code (required)
     * @returns {Promise<string>} Generated VIN
     */
    static async generateVIN(vehicleModel, plantCode) {
        try {
            // Kiểm tra các tham số bắt buộc
            if (!vehicleModel || !vehicleModel.manufacturer) {
                throw new Error('Vehicle model and manufacturer are required');
            }
            if (!plantCode) {
                throw new Error('Plant code is required');
            }

            // Get WMI (World Manufacturer Identifier) from shared constants
            const wmi = WMI_CODES[vehicleModel.manufacturer];
            if (!wmi) {
                throw new Error(`Unsupported manufacturer: ${vehicleModel.manufacturer}`);
            }

            // Lấy VDS (Vehicle Descriptor Section)
            const vds = this.encodeVDS(vehicleModel);

            // Get model year code from shared constants
            const yearCode = YEAR_CODES[vehicleModel.year];
            if (!yearCode) {
                throw new Error(`Unsupported model year: ${vehicleModel.year}`);
            }

            // Kiểm tra mã nhà máy
            const validPlantCode = plantCode.toUpperCase();
            if (!/^[A-HJ-NPR-Z0-9]$/.test(validPlantCode)) {
                throw new Error(`Invalid plant code: ${plantCode}`);
            }

            // Lấy model VIN Counter
            const VINCounter = require('../Model/VINCounter')();

            // Lấy số tuần tự tiếp theo (thao tác nguyên tử)
            const sequence = await VINCounter.getNextSequence(
                wmi,
                vehicleModel.modelCode,
                vehicleModel.year,
                validPlantCode
            );

            // Định dạng số tuần tự (6 chữ số)
            const sequential = sequence.toString().padStart(6, '0');

            // Xây dựng VIN không có check digit (vị trí 9 = X tạm thời)
            const vinWithoutCheck = `${wmi}${vds}X${yearCode}${validPlantCode}${sequential}`;

            // Tính check digit
            const checkDigit = this.calculateCheckDigit(vinWithoutCheck);

            // Xây dựng VIN cuối cùng
            const finalVIN = `${wmi}${vds}${checkDigit}${yearCode}${validPlantCode}${sequential}`;

            // Kiểm tra VIN cuối cùng
            const validation = this.validateVIN(finalVIN);
            if (!validation.valid) {
                throw new Error(`Generated invalid VIN: ${validation.error}`);
            }

            return finalVIN;

        } catch (error) {
            console.error('❌ VIN Generation Error:', error);
            throw new Error(`VIN generation failed: ${error.message}`);
        }
    }

    /**
     * Validate VIN format and check digit
     * @param {string} vin - VIN to validate
     * @returns {Object} Validation result
     */
    static validateVIN(vin) {
        try {
            // Sử dụng validation format chung
            const formatValidation = validateVINFormat(vin);
            if (!formatValidation.valid) {
                return formatValidation;
            }

            // Kiểm tra check digit
            const checkDigit = vin[8];
            const calculatedCheck = this.calculateCheckDigit(vin);

            if (checkDigit !== calculatedCheck) {
                return {
                    valid: false,
                    error: `Invalid check digit. Expected: ${calculatedCheck}, Got: ${checkDigit}`
                };
            }

            return { valid: true };

        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Parse VIN to extract information
     * @param {string} vin - VIN to parse
     * @returns {Object} Parsed VIN information
     */
    static parseVIN(vin) {
        const validation = this.validateVIN(vin);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const wmi = vin.substring(0, 3);
        const vds = vin.substring(3, 8);
        const checkDigit = vin[8];
        const yearCode = vin[9];
        const plantCode = vin[10];
        const sequential = vin.substring(11, 17);

        // Tìm nhà sản xuất bằng reverse mapping chung
        const manufacturer = WMI_REVERSE[wmi] || 'Unknown';

        // Tìm năm bằng reverse mapping chung
        const year = YEAR_REVERSE[yearCode] || 'Unknown';

        // Tìm nhà máy bằng reverse mapping chung
        const plant = PLANT_REVERSE[plantCode] || 'Unknown';

        return {
            vin,
            wmi,
            vds,
            checkDigit,
            yearCode,
            plantCode,
            sequential: parseInt(sequential),
            manufacturer,
            year: year !== 'Unknown' ? parseInt(year) : null,
            plant,
            isValid: true
        };
    }


}

module.exports = VINGenerator;