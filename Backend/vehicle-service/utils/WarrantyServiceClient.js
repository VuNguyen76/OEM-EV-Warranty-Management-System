/**
 * Client để gọi Warranty Service API
 * Dùng để lấy thông tin claims và warranty costs
 */
class WarrantyServiceClient {
    constructor() {
        this.baseURL = process.env.WARRANTY_SERVICE_URL;
    }

    /**
     * Lấy danh sách claims theo VIN
     */
    async getClaimsByVIN(vin) {
        try {
            const response = await fetch(`${this.baseURL}/api/claims?vin=${vin}`);
            const data = await response.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('Error getting claims:', error.message);
            return [];
        }
    }

    /**
     * Lấy thống kê claims theo VIN
     */
    async getClaimsStats(vin) {
        try {
            const claims = await this.getClaimsByVIN(vin);

            return {
                total: claims.length,
                by_status: {
                    submitted: claims.filter(c => c.status === 'submitted').length,
                    under_review: claims.filter(c => c.status === 'under_review').length,
                    approved: claims.filter(c => c.status === 'approved').length,
                    rejected: claims.filter(c => c.status === 'rejected').length,
                    completed: claims.filter(c => c.status === 'completed').length
                },
                active_claims: claims.filter(c =>
                    ['submitted', 'under_review', 'approved'].includes(c.status)
                ).length
            };
        } catch (error) {
            console.error('Error getting claims stats:', error.message);
            return { total: 0, by_status: {}, active_claims: 0 };
        }
    }
}

export default new WarrantyServiceClient();
