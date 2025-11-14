class CreatePartDto {
    constructor(data) {
        this.part_catalog_id = data.part_catalog_id?.trim();
        this.vehicle_id = data.vehicle_id?.trim() || null;
        this.status = data.status || 'active';
    }

    validate() {
        const errors = [];

        if (!this.part_catalog_id) errors.push('Thiếu mã PartCatalog');

        if (this.status && !['active', 'replaced', 'defective'].includes(this.status)) {
            errors.push('Trạng thái không hợp lệ');
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        const model = {
            part_catalog_id: this.part_catalog_id,
            status: this.status,
        };

        if (this.vehicle_id !== undefined) model.vehicle_id = this.vehicle_id || null;

        return model;
    }
}

export default CreatePartDto;
