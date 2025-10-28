class UpdatePartDto {
    constructor(data) {
        this.name = data.name?.trim();
        this.category = data.category;
        this.manufacturer = data.manufacturer?.trim();
        this.model_compatible = data.model_compatible;
        this.warranty_policy_code = data.warranty_policy_code?.trim();
        this.cost_price = data.cost_price;
        this.weight_kg = data.weight_kg;
        this.dimensions = data.dimensions;
        this.description = data.description?.trim();
        this.image_url = data.image_url?.trim();
        this.status = data.status;
    }

    validate() {
        const errors = [];

        if (this.category && !['battery', 'motor', 'bms', 'charger', 'inverter', 'sensor'].includes(this.category)) {
            errors.push('Loại phụ tùng không hợp lệ');
        }

        if (this.status && !['active', 'discontinued', 'out_of_stock'].includes(this.status)) {
            errors.push('Trạng thái không hợp lệ');
        }

        if (this.cost_price !== undefined && this.cost_price < 0) {
            errors.push('Giá không được âm');
        }

        if (this.weight_kg !== undefined && this.weight_kg < 0) {
            errors.push('Trọng lượng không được âm');
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        const updateData = {};

        if (this.name) updateData.name = this.name;
        if (this.category) updateData.category = this.category;
        if (this.manufacturer) updateData.manufacturer = this.manufacturer;
        if (this.model_compatible) updateData.model_compatible = this.model_compatible;
        if (this.warranty_policy_code !== undefined) updateData.warranty_policy_code = this.warranty_policy_code;
        if (this.cost_price !== undefined) updateData.cost_price = this.cost_price;
        if (this.weight_kg !== undefined) updateData.weight_kg = this.weight_kg;
        if (this.dimensions) updateData.dimensions = this.dimensions;
        if (this.description !== undefined) updateData.description = this.description;
        if (this.image_url !== undefined) updateData.image_url = this.image_url;
        if (this.status) updateData.status = this.status;

        return updateData;
    }
}

export default UpdatePartDto;
