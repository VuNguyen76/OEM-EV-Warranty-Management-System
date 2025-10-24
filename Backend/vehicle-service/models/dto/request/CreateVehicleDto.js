class CreateVehicleDto {
    constructor(data) {
        this.vin = data.vin?.trim();
        this.brand = data.brand?.trim();
        this.model = data.model?.trim();
        this.manufacture_year = data.manufacture_year;
        this.color = data.color;
        this.battery_capacity = data.battery_capacity;
        this.customer_id = data.customer_id;
        this.warranty_start = data.warranty_start;
        this.warranty_end = data.warranty_end;
        this.warranty_status = data.warranty_status;
        this.current_mileage = data.current_mileage;
        this.notes = data.notes?.trim();
    }

    validate() {
        const errors = [];
        if (!this.vin) errors.push("Nhập thiếu VIN");
        if (this.vin && this.vin.length !== 17) errors.push("VIN phải có 17 ký tự");
        if (!this.brand) errors.push("Nhập thiếu brand");
        if (!this.model) errors.push("Nhập thiếu model");
        if (!this.manufacture_year) errors.push("Nhập thiếu manufacture_year");
        if (this.manufacture_year && (this.manufacture_year < 1900 || this.manufacture_year > new Date().getFullYear() + 1)) {
            errors.push("Năm sản xuất không hợp lệ");
        }
        if (!this.customer_id) errors.push("Nhập thiếu customer_id");
        if (!this.warranty_start) errors.push("Nhập thiếu warranty_start");
        if (!this.warranty_end) errors.push("Nhập thiếu warranty_end");
        if (this.warranty_start && this.warranty_end && new Date(this.warranty_start) >= new Date(this.warranty_end)) {
            errors.push("Ngày bắt đầu bảo hành phải trước ngày kết thúc");
        }
        if (!this.warranty_status) errors.push("Nhập thiếu warranty_status");
        if (this.warranty_status && !['valid', 'expired', 'void'].includes(this.warranty_status)) {
            errors.push("Trạng thái bảo hành không hợp lệ");
        }
        if (this.current_mileage === undefined || this.current_mileage === null) errors.push("Nhập thiếu current_mileage");
        const newErrors = errors.join("\n");
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        return {
            vin: this.vin,
            brand: this.brand,
            model: this.model,
            manufacture_year: this.manufacture_year,
            color: this.color,
            battery_capacity: this.battery_capacity,
            customer_id: this.customer_id,
            warranty_start: this.warranty_start,
            warranty_end: this.warranty_end,
            warranty_status: this.warranty_status,
            current_mileage: this.current_mileage,
            notes: this.notes
        };
    }
}

export default CreateVehicleDto;