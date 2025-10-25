class UpdateWarrantyPolicyDto {
    constructor(data) {
        this.name = data.name?.trim();
        this.description = data.description?.trim();
        this.model_applicable = data.model_applicable;
        this.duration_months = data.duration_months;
        this.max_mileage = data.max_mileage;
        this.conditions = data.conditions;
        this.status = data.status;
    }

    validate() {
        const errors = [];

        if (this.status && !['draft', 'active', 'expired'].includes(this.status)) {
            errors.push('Trạng thái không hợp lệ');
        }

        if (this.duration_months && this.duration_months <= 0) {
            errors.push('Thời hạn bảo hành phải lớn hơn 0');
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        const updateData = {};

        if (this.name) updateData.name = this.name;
        if (this.description) updateData.description = this.description;
        if (this.model_applicable) updateData.model_applicable = this.model_applicable;
        if (this.duration_months !== undefined) updateData.duration_months = this.duration_months;
        if (this.max_mileage !== undefined) updateData.max_mileage = this.max_mileage;
        if (this.conditions) updateData.conditions = this.conditions;
        if (this.status) updateData.status = this.status;

        return updateData;
    }
}

export default UpdateWarrantyPolicyDto;