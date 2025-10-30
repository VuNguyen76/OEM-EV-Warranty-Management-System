/**
 * Client để gọi Part Service API
 * Dùng để lấy thông tin phụ tùng từ Part Service (Single Source of Truth)
 */
class PartServiceClient {
    constructor() {
        this.baseURL = process.env.PART_SERVICE_URL || 'http://localhost:3001';
    }

    /**
     * Lấy thông tin phụ tùng theo part_id
     */
    async getPartById(part_id) {
        try {
            const response = await fetch(`${this.baseURL}/api/parts/${part_id}`);
            const data = await response.json();

            if (data.success) {
                return data.data;
            }

            return null;
        } catch (error) {
            console.error('Error getting part:', error.message);
            return null;
        }
    }

    /**
     * Lấy danh sách phụ tùng theo filter
     */
    async getParts(filters = {}) {
        try {
            const queryParams = new URLSearchParams(filters);
            const response = await fetch(`${this.baseURL}/api/parts?${queryParams}`);
            const data = await response.json();

            return data.success ? data.data : [];
        } catch (error) {
            console.error('Error getting parts:', error.message);
            return [];
        }
    }

    /**
     * Tìm kiếm phụ tùng
     */
    async searchParts(keyword) {
        try {
            const response = await fetch(`${this.baseURL}/api/parts/search?q=${encodeURIComponent(keyword)}`);
            const data = await response.json();

            return data.success ? data.data : [];
        } catch (error) {
            console.error('Error searching parts:', error.message);
            return [];
        }
    }

    /**
     * Validate part_id có tồn tại
     */
    async validatePartId(part_id) {
        try {
            const part = await this.getPartById(part_id);
            return { isValid: !!part, part };
        } catch (error) {
            console.error('Error validating part_id:', error.message);
            // Trong trường hợp lỗi network, cho phép tạo (eventual consistency)
            return { isValid: true, part: null };
        }
    }
}

export default new PartServiceClient();
