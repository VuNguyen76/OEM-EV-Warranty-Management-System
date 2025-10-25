class WarrantyPolicyResponseDto {
    constructor(data) {
        this.id = data._id;
        this.name = data.name;
        this.description = data.description;
        this.model_applicable = data.model_applicable;
        this.part_category = data.part_category;
        this.duration_months = data.duration_months;
        this.max_mileage = data.max_mileage;
        this.conditions = data.conditions;
        this.status = data.status;
        this.created_at = data.createdAt;
        this.updated_at = data.updatedAt;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            model_applicable: this.model_applicable,
            part_category: this.part_category,
            duration_months: this.duration_months,
            max_mileage: this.max_mileage,
            conditions: this.conditions,
            status: this.status,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

export default WarrantyPolicyResponseDto;