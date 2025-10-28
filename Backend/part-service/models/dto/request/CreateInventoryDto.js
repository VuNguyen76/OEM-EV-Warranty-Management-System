class CreateInventoryDto {
    constructor(data) {
        this.part_id = data.part_id?.trim();
        this.quantity = data.quantity || 0;
        this.threshold = data.threshold || 3;
    }

    validate() {
        const errors = [];

        if (!this.part_id) errors.push('Thiếu mã phụ tùng');
        if (this.quantity < 0) errors.push('Số lượng không được âm');
        if (this.threshold < 0) errors.push('Ngưỡng cảnh báo không được âm');

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        return {
            part_id: this.part_id,
            quantity: this.quantity,
            threshold: this.threshold
        };
    }
}

export default CreateInventoryDto;
