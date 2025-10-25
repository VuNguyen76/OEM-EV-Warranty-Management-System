/**
 * Client để gọi Vehicle Service API
 * Dùng để validate VIN và lấy thông tin xe
 */
class VehicleServiceClient {
    constructor() {
        this.baseURL = process.env.VEHICLE_SERVICE_URL;
    }

    /**
     * Validate VIN có tồn tại trong Vehicle Service
     */
    async validateVIN(vin) {
        try {
            const response = await fetch(`${this.baseURL}/api/vehicles/search?q=${vin}`);
            const data = await response.json();

            if (data.success && data.count > 0) {
                const vehicle = data.data.find(v => v.vin === vin);
                return { isValid: !!vehicle, vehicle };
            }

            return { isValid: false, vehicle: null };
        } catch (error) {
            console.error('Error validating VIN:', error.message);
            // Trong trường hợp lỗi network, cho phép tạo claim (eventual consistency)
            return { isValid: true, vehicle: null };
        }
    }

    /**
     * Lấy thông tin xe theo VIN
     */
    async getVehicleByVIN(vin) {
        try {
            const response = await fetch(`${this.baseURL}/api/vehicles/search?q=${vin}`);
            const data = await response.json();

            if (data.success && data.count > 0) {
                return data.data.find(v => v.vin === vin);
            }

            return null;
        } catch (error) {
            console.error('Error getting vehicle:', error.message);
            return null;
        }
    }
}

export default new VehicleServiceClient();