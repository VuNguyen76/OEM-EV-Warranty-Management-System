class UpdateVehicleDto {
    constructor(data) {
        this.brand = data.brand?.trim();
        this.model = data.model?.trim();
        this.manufacture_year = data.manufacture_year;
        this.color = data.color?.trim();
        this.battery_capacity = data.battery_capacity;
        this.registration_number = data.registration_number?.trim();
        this.warranty_start = data.warranty_start;
        this.warranty_end = data.warranty_end;
        this.warranty_status = data.warranty_status;
        this.current_mileage = data.current_mileage;
        this.status = data.status;
        this.notes = data.notes?.trim();
    }

    validate() {
        const errors = [];

        if (this.manufacture_year && (this.manufacture_year < 1900 || this.manufacture_year > new Date().getFullYear() + 1)) {
            errors.push('Năm sản xuất không hợp lệ');
        }
        if (this.warranty_status && !['valid', 'expired', 'void'].includes(this.warranty_status)) {
            errors.push('Trạng thái bảo hành không hợp lệ');
        }
        if (this.status && !['active', 'sold', 'inactive', 'recalled'].includes(this.status)) {
            errors.push('Trạng thái xe không hợp lệ');
        }

        const newErrors = errors.join("\n");
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        const updateData = {};

        if (this.brand) updateData.brand = this.brand;
        if (this.model) updateData.model = this.model;
        if (this.manufacture_year) updateData.manufacture_year = this.manufacture_year;
        if (this.color) updateData.color = this.color;
        if (this.battery_capacity) updateData.battery_capacity = this.battery_capacity;
        if (this.registration_number) updateData.registration_number = this.registration_number;
        if (this.warranty_start) updateData.warranty_start = this.warranty_start;
        if (this.warranty_end) updateData.warranty_end = this.warranty_end;
        if (this.warranty_status) updateData.warranty_status = this.warranty_status;
        if (this.current_mileage !== undefined) updateData.current_mileage = this.current_mileage;
        if (this.status) updateData.status = this.status;
        if (this.notes) updateData.notes = this.notes;

        return updateData;
    }
}

export default UpdateVehicleDto;