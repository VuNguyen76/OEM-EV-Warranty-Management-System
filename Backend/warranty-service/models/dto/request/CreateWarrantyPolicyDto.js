class CreateWarrantyPolicyDto {
    constructor(data) {
        this.name = data.name?.trim();
        this.description = data.description?.trim();
        this.model_applicable = data.model_applicable || [];
        this.part_category = data.part_category;
        this.duration_months = data.duration_months;
        this.max_mileage = data.max_mileage;
        this.conditions = data.conditions || [];
        this.status = data.status || 'active';
    }

    validate() {
        const errors = [];

        if (!this.name) errors.push('Thiếu tên chính sách');
        if (!this.part_category) errors.push('Thiếu loại phụ tùng');
        if (!this.duration_months) errors.push('Thiếu thời hạn bảo hành');

        if (this.part_category && !['battery', 'motor', 'bms', 'charger', 'inverter'].includes(this.part_category)) {
            errors.push('Loại phụ tùng không hợp lệ');
        }

        if (this.status && !['active', 'inactive'].includes(this.status)) {
            errors.push('Trạng thái không hợp lệ');
        }

        if (this.duration_months && this.duration_months <= 0) {
            errors.push('Thời hạn bảo hành phải lớn hơn 0');
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        return {
            name: this.name,
            description: this.description,
            model_applicable: this.model_applicable,
            part_category: this.part_category,
            duration_months: this.duration_months,
            max_mileage: this.max_mileage,
            conditions: this.conditions,
            status: this.status
        };
    }
}

export default CreateWarrantyPolicyDto;