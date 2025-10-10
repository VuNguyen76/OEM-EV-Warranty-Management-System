/**
 * Campaign Code Generator Service
 * Generates unique campaign codes for recall campaigns
 * Format: RC-YYYY-NNN (e.g., RC-2024-001)
 */

class CampaignCodeGenerator {
    constructor() {
        this.prefix = 'RC'; // Recall Campaign
        this.yearFormat = 'YYYY';
        this.numberPadding = 3;
    }

    /**
     * Generate next campaign code
     * @param {Function} findLastCampaign - Function to find last campaign
     * @returns {string} Generated campaign code
     */
    async generateCode(findLastCampaign) {
        try {
            const year = new Date().getFullYear();
            const yearPattern = `^${this.prefix}-${year}-`;
            
            // Find last campaign for current year
            const lastCampaign = await findLastCampaign({
                campaignCode: new RegExp(yearPattern)
            }, {
                sort: { campaignCode: -1 }
            });

            let nextNumber = 1;
            
            if (lastCampaign && lastCampaign.campaignCode) {
                const parts = lastCampaign.campaignCode.split('-');
                if (parts.length === 3 && parts[1] === year.toString()) {
                    const currentNumber = parseInt(parts[2]);
                    if (!isNaN(currentNumber)) {
                        nextNumber = currentNumber + 1;
                    }
                }
            }

            return this.formatCode(year, nextNumber);
        } catch (error) {
            console.error('Error generating campaign code:', error);
            throw new Error('Không thể tạo mã chiến dịch: ' + error.message);
        }
    }

    /**
     * Format campaign code
     * @param {number} year - Year
     * @param {number} number - Sequential number
     * @returns {string} Formatted code
     */
    formatCode(year, number) {
        const paddedNumber = String(number).padStart(this.numberPadding, '0');
        return `${this.prefix}-${year}-${paddedNumber}`;
    }

    /**
     * Validate campaign code format
     * @param {string} code - Campaign code to validate
     * @returns {boolean} True if valid
     */
    isValidCode(code) {
        if (!code || typeof code !== 'string') return false;
        
        const pattern = new RegExp(`^${this.prefix}-\\d{4}-\\d{${this.numberPadding}}$`);
        return pattern.test(code);
    }

    /**
     * Parse campaign code
     * @param {string} code - Campaign code to parse
     * @returns {Object} Parsed components {prefix, year, number}
     */
    parseCode(code) {
        if (!this.isValidCode(code)) {
            throw new Error('Mã chiến dịch không hợp lệ');
        }

        const parts = code.split('-');
        return {
            prefix: parts[0],
            year: parseInt(parts[1]),
            number: parseInt(parts[2])
        };
    }

    /**
     * Get next available code for specific year
     * @param {number} year - Target year
     * @param {Function} findLastCampaign - Function to find last campaign
     * @returns {string} Next available code
     */
    async getNextCodeForYear(year, findLastCampaign) {
        try {
            const yearPattern = `^${this.prefix}-${year}-`;
            
            const lastCampaign = await findLastCampaign({
                campaignCode: new RegExp(yearPattern)
            }, {
                sort: { campaignCode: -1 }
            });

            let nextNumber = 1;
            
            if (lastCampaign && lastCampaign.campaignCode) {
                const parts = lastCampaign.campaignCode.split('-');
                if (parts.length === 3 && parts[1] === year.toString()) {
                    const currentNumber = parseInt(parts[2]);
                    if (!isNaN(currentNumber)) {
                        nextNumber = currentNumber + 1;
                    }
                }
            }

            return this.formatCode(year, nextNumber);
        } catch (error) {
            console.error('Error getting next code for year:', error);
            throw new Error('Không thể tạo mã chiến dịch cho năm ' + year);
        }
    }

    /**
     * Check if campaign code already exists
     * @param {string} code - Campaign code to check
     * @param {Function} findCampaign - Function to find campaign
     * @returns {boolean} True if exists
     */
    async codeExists(code, findCampaign) {
        try {
            const campaign = await findCampaign({ campaignCode: code });
            return !!campaign;
        } catch (error) {
            console.error('Error checking code existence:', error);
            return false;
        }
    }

    /**
     * Generate unique code with retry mechanism
     * @param {Function} findLastCampaign - Function to find last campaign
     * @param {Function} findCampaign - Function to find campaign by code
     * @param {number} maxRetries - Maximum retry attempts
     * @returns {string} Unique campaign code
     */
    async generateUniqueCode(findLastCampaign, findCampaign, maxRetries = 10) {
        let attempts = 0;
        
        while (attempts < maxRetries) {
            try {
                const code = await this.generateCode(findLastCampaign);
                const exists = await this.codeExists(code, findCampaign);
                
                if (!exists) {
                    return code;
                }
                
                attempts++;
                console.warn(`Campaign code ${code} already exists, retrying... (${attempts}/${maxRetries})`);
                
                // Add small delay to avoid race conditions
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                attempts++;
                if (attempts >= maxRetries) {
                    throw error;
                }
                console.warn(`Error generating code, retrying... (${attempts}/${maxRetries}):`, error.message);
            }
        }
        
        throw new Error(`Không thể tạo mã chiến dịch duy nhất sau ${maxRetries} lần thử`);
    }

    /**
     * Get campaign statistics by year
     * @param {Function} findCampaigns - Function to find campaigns
     * @param {number} year - Target year (optional, defaults to current year)
     * @returns {Object} Statistics
     */
    async getYearStatistics(findCampaigns, year = null) {
        try {
            const targetYear = year || new Date().getFullYear();
            const yearPattern = `^${this.prefix}-${targetYear}-`;
            
            const campaigns = await findCampaigns({
                campaignCode: new RegExp(yearPattern)
            });

            const stats = {
                year: targetYear,
                totalCampaigns: campaigns.length,
                byStatus: {},
                bySeverity: {},
                byType: {}
            };

            campaigns.forEach(campaign => {
                // Count by status
                const status = campaign.status || 'unknown';
                stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

                // Count by severity
                const severity = campaign.severity || 'unknown';
                stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;

                // Count by type
                const type = campaign.campaignType || 'unknown';
                stats.byType[type] = (stats.byType[type] || 0) + 1;
            });

            return stats;
        } catch (error) {
            console.error('Error getting year statistics:', error);
            throw new Error('Không thể lấy thống kê năm: ' + error.message);
        }
    }

    /**
     * Validate year for campaign code generation
     * @param {number} year - Year to validate
     * @returns {boolean} True if valid
     */
    isValidYear(year) {
        const currentYear = new Date().getFullYear();
        const minYear = 2020; // Minimum supported year
        const maxYear = currentYear + 5; // Maximum 5 years in future
        
        return Number.isInteger(year) && year >= minYear && year <= maxYear;
    }

    /**
     * Get code pattern for regex matching
     * @param {number} year - Optional year filter
     * @returns {RegExp} Regex pattern
     */
    getCodePattern(year = null) {
        if (year) {
            return new RegExp(`^${this.prefix}-${year}-\\d{${this.numberPadding}}$`);
        }
        return new RegExp(`^${this.prefix}-\\d{4}-\\d{${this.numberPadding}}$`);
    }

    /**
     * Extract year from campaign code
     * @param {string} code - Campaign code
     * @returns {number} Year
     */
    extractYear(code) {
        if (!this.isValidCode(code)) {
            throw new Error('Mã chiến dịch không hợp lệ');
        }
        
        const parts = code.split('-');
        return parseInt(parts[1]);
    }

    /**
     * Extract sequential number from campaign code
     * @param {string} code - Campaign code
     * @returns {number} Sequential number
     */
    extractNumber(code) {
        if (!this.isValidCode(code)) {
            throw new Error('Mã chiến dịch không hợp lệ');
        }
        
        const parts = code.split('-');
        return parseInt(parts[2]);
    }

    /**
     * Generate test codes for development/testing
     * @param {number} count - Number of codes to generate
     * @param {number} year - Target year
     * @returns {Array} Array of test codes
     */
    generateTestCodes(count = 5, year = null) {
        const targetYear = year || new Date().getFullYear();
        const codes = [];
        
        for (let i = 1; i <= count; i++) {
            codes.push(this.formatCode(targetYear, i));
        }
        
        return codes;
    }
}

module.exports = CampaignCodeGenerator;
