/**
 * VIN Generator Utility - ISO 3779 Compliant
 * Generates Vehicle Identification Numbers according to international standards
 */

class VINGenerator {
    // World Manufacturer Identifier codes (WMI)
    static WMI_CODES = {
        'VinFast': 'LVG',
        'Tesla': '5YJ',
        'Tesla Inc': '5YJ',
        'BYD': 'LGB',
        'BMW': 'WBA',
        'Mercedes': 'WDD',
        'Audi': 'WAU',
        'Toyota': 'JTD',
        'Honda': 'JHM',
        'Hyundai': 'KMH',
        'Kia': 'KNA',
        'Ford': '1FA',
        'GM': '1G1',
        'Volkswagen': 'WVW',
        'Nissan': 'JN1',
        'Mazda': 'JM1',
        'Test Motors': 'TMT',
        'EV Motors': 'EVM'
    };

    // Model year codes (ISO 3779)
    static YEAR_CODES = {
        2020: 'L',
        2021: 'M',
        2022: 'N',
        2023: 'P',
        2024: 'R',
        2025: 'S',
        2026: 'T',
        2027: 'V',
        2028: 'W',
        2029: 'X',
        2030: 'Y',
        2031: '1',
        2032: '2',
        2033: '3',
        2034: '4',
        2035: '5',
        2036: '6',
        2037: '7',
        2038: '8',
        2039: '9'
    };

    // Plant codes
    static PLANT_CODES = {
        'Hanoi': 'H',
        'HoChiMinh': 'S',
        'DaNang': 'D',
        'HaiPhong': 'P',
        'CanTho': 'C',
        'Hue': 'U',
        'NhaTrang': 'N',
        'VungTau': 'V'
    };

    /**
     * Encode Vehicle Descriptor Section (VDS) - 5 characters
     * @param {Object} vehicleModel - Vehicle model information
     * @returns {string} 5-character VDS
     */
    static encodeVDS(vehicleModel) {
        // Character 1: Vehicle type
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

        // Character 2: Battery capacity (encoded)
        const batteryCode = Math.min(9, Math.floor((vehicleModel.batteryCapacity || 50) / 10));

        // Character 3: Motor power (encoded)
        const motorPower = vehicleModel.motorPower || 200;
        const motorCode = motorPower > 400 ? '9' :
            motorPower > 300 ? '7' :
                motorPower > 200 ? '5' :
                    motorPower > 100 ? '3' : '1';

        // Characters 4-5: Variant/trim level
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
            if (i === 8) continue; // Skip check digit position
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
            // Validate required parameters
            if (!vehicleModel || !vehicleModel.manufacturer) {
                throw new Error('Vehicle model and manufacturer are required');
            }
            if (!plantCode) {
                throw new Error('Plant code is required');
            }

            // Get WMI (World Manufacturer Identifier)
            const wmi = this.WMI_CODES[vehicleModel.manufacturer];
            if (!wmi) {
                throw new Error(`Unsupported manufacturer: ${vehicleModel.manufacturer}`);
            }

            // Get VDS (Vehicle Descriptor Section)
            const vds = this.encodeVDS(vehicleModel);

            // Get model year code
            const yearCode = this.YEAR_CODES[vehicleModel.year];
            if (!yearCode) {
                throw new Error(`Unsupported model year: ${vehicleModel.year}`);
            }

            // Validate plant code
            const validPlantCode = plantCode.toUpperCase();
            if (!/^[A-HJ-NPR-Z0-9]$/.test(validPlantCode)) {
                throw new Error(`Invalid plant code: ${plantCode}`);
            }

            // Get VIN Counter model
            const VINCounter = require('../Model/VINCounter')();

            // Get next sequential number (atomic operation)
            const sequence = await VINCounter.getNextSequence(
                wmi,
                vehicleModel.modelCode,
                vehicleModel.year,
                validPlantCode
            );

            // Format sequential number (6 digits)
            const sequential = sequence.toString().padStart(6, '0');

            // Build VIN without check digit (position 9 = X temporarily)
            const vinWithoutCheck = `${wmi}${vds}X${yearCode}${validPlantCode}${sequential}`;

            // Calculate check digit
            const checkDigit = this.calculateCheckDigit(vinWithoutCheck);

            // Build final VIN
            const finalVIN = `${wmi}${vds}${checkDigit}${yearCode}${validPlantCode}${sequential}`;

            // Validate final VIN
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
            // Check length
            if (!vin || vin.length !== 17) {
                return { valid: false, error: 'VIN must be exactly 17 characters' };
            }

            // Check format (no I, O, Q allowed)
            if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
                return { valid: false, error: 'VIN contains invalid characters (I, O, Q not allowed)' };
            }

            // Validate check digit
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

        // Find manufacturer
        const manufacturer = Object.keys(this.WMI_CODES).find(
            key => this.WMI_CODES[key] === wmi
        ) || 'Unknown';

        // Find year
        const year = Object.keys(this.YEAR_CODES).find(
            key => this.YEAR_CODES[key] === yearCode
        ) || 'Unknown';

        // Find plant
        const plant = Object.keys(this.PLANT_CODES).find(
            key => this.PLANT_CODES[key] === plantCode
        ) || 'Unknown';

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