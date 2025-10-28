class CreatePartDto {
    constructor(data) {
        this.part_id = data.part_id?.trim();
        this.name = data.name?.trim();
        this.category = data.category;
        this.manufacturer = data.manufacturer?.trim();
        this.model_compatible = data.model_compatible || [];
        this.warranty_policy_code = data.warranty_policy_code?.trim();
        this.cost_price = data.cost_price || 0;
        this.weight_kg = data.weight_kg || 0;
        this.dimensions = data.dimensions || {};
        this.description = data.description?.trim();
        this.image_url = data.image_url?.trim();
        this.status = data.status || 'active';
    }

    validate() {
        const errors = [];

        if (!this.part_id) errors.push('Thiếu mã phụ tùng');
        if (!this.name) errors.push('Thiếu tên phụ tùng');
        if (!this.category) errors.push('Thiếu loại phụ tùng');
        if (!this.manufacturer) errors.push('Thiếu tên nhà sản xuất');

        if (this.category && !['battery', 'motor', 'bms', 'charger', 'inverter', 'sensor'].includes(this.category)) {
            errors.push('Loại phụ tùng không hợp lệ');
        }

        if (this.status && !['active', 'discontinued', 'out_of_stock'].includes(this.status)) {
            errors.push('Trạng thái không hợp lệ');
        }

        if (this.cost_price < 0) {
            errors.push('Giá không được âm');
        }

        if (this.weight_kg < 0) {
            errors.push('Trọng lượng không được âm');
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        return {
            part_id: this.part_id,
            name: this.name,
            category: this.category,
            manufacturer: this.manufacturer,
            model_compatible: this.model_compatible,
            warranty_policy_code: this.warranty_policy_code,
            cost_price: this.cost_price,
            weight_kg: this.weight_kg,
            dimensions: this.dimensions,
            description: this.description,
            image_url: this.image_url,
            status: this.status
        };
    }
}

export default CreatePartDto;
