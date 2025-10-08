/**
 * VIN Constants - Shared across all services
 * Single source of truth for VIN-related mappings
 */

// World Manufacturer Identifier codes (WMI) - ISO 3779
const WMI_CODES = {
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
const YEAR_CODES = {
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
const PLANT_CODES = {
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
 * Create reverse mapping (code → value)
 * @param {Object} mapping - Original mapping (value → code)
 * @returns {Object} Reverse mapping (code → value)
 */
const createReverseMapping = (mapping) => {
    const reverse = {};
    for (const [key, value] of Object.entries(mapping)) {
        reverse[value] = key;
    }
    return reverse;
};

// Reverse mappings for parsing
const WMI_REVERSE = createReverseMapping(WMI_CODES);
const YEAR_REVERSE = createReverseMapping(YEAR_CODES);
const PLANT_REVERSE = createReverseMapping(PLANT_CODES);

/**
 * Basic VIN format validation
 * @param {string} vin - VIN to validate
 * @returns {Object} Validation result
 */
const validateVINFormat = (vin) => {
    if (!vin || typeof vin !== 'string') {
        return { valid: false, error: 'VIN is required and must be a string' };
    }

    const cleanVIN = vin.trim().toUpperCase();

    // Basic VIN validation (17 characters, alphanumeric except I, O, Q)
    if (cleanVIN.length !== 17) {
        return { valid: false, error: 'VIN must be exactly 17 characters' };
    }

    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVIN)) {
        return { valid: false, error: 'VIN contains invalid characters (I, O, Q not allowed)' };
    }

    return { valid: true, vin: cleanVIN };
};

/**
 * Basic VIN parsing (without check digit validation)
 * @param {string} vin - VIN to parse
 * @returns {Object} Parsed VIN information
 */
const parseVINBasic = (vin) => {
    const validation = validateVINFormat(vin);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const cleanVIN = validation.vin;
    const wmi = cleanVIN.substring(0, 3);
    const vds = cleanVIN.substring(3, 8);
    const checkDigit = cleanVIN[8];
    const yearCode = cleanVIN[9];
    const plantCode = cleanVIN[10];
    const sequential = cleanVIN.substring(11, 17);

    return {
        vin: cleanVIN,
        wmi,
        vds,
        checkDigit,
        yearCode,
        plantCode,
        sequential: parseInt(sequential),
        manufacturer: WMI_REVERSE[wmi] || 'Unknown',
        year: YEAR_REVERSE[yearCode] ? parseInt(YEAR_REVERSE[yearCode]) : null,
        plant: PLANT_REVERSE[plantCode] || 'Unknown'
    };
};

/**
 * Get manufacturer from VIN
 * @param {string} vin - VIN to parse
 * @returns {string} Manufacturer name
 */
const getManufacturerFromVIN = (vin) => {
    const validation = validateVINFormat(vin);
    if (!validation.valid) {
        return 'Unknown';
    }
    const wmi = validation.vin.substring(0, 3);
    return WMI_REVERSE[wmi] || 'Unknown';
};

/**
 * Get year from VIN
 * @param {string} vin - VIN to parse
 * @returns {number|null} Year or null if invalid
 */
const getYearFromVIN = (vin) => {
    const validation = validateVINFormat(vin);
    if (!validation.valid) {
        return null;
    }
    const yearCode = validation.vin[9];
    return YEAR_REVERSE[yearCode] ? parseInt(YEAR_REVERSE[yearCode]) : null;
};

/**
 * Get plant location from VIN
 * @param {string} vin - VIN to parse
 * @returns {string} Plant location
 */
const getPlantFromVIN = (vin) => {
    const validation = validateVINFormat(vin);
    if (!validation.valid) {
        return 'Unknown';
    }
    const plantCode = validation.vin[10];
    return PLANT_REVERSE[plantCode] || 'Unknown';
};

module.exports = {
    // Mappings
    WMI_CODES,
    YEAR_CODES,
    PLANT_CODES,
    WMI_REVERSE,
    YEAR_REVERSE,
    PLANT_REVERSE,

    // Validation & Parsing
    validateVINFormat,
    parseVINBasic,

    // Utility functions
    getManufacturerFromVIN,
    getYearFromVIN,
    getPlantFromVIN
};