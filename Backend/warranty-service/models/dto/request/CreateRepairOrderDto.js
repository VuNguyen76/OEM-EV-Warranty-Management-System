class CreateRepairOrderDto {
    constructor(data) {
        this.claim_id = data.claim_id;
        this.parts = Array.isArray(data.parts) ? data.parts : [];
        this.repair_description = data.repair_description?.trim();
        this.start_date = data.start_date || new Date();
    }

    validate() {
        const errors = [];

        if (!this.claim_id) {
            errors.push('Thiếu claim_id');
        }

        if (!Array.isArray(this.parts) || this.parts.length === 0) {
            errors.push('Thiếu thông tin phụ tùng cần thay thế');
        } else {
            this.parts.forEach((part, index) => {
                if (!part.part_id) {
                    errors.push(`Phụ tùng thứ ${index + 1}: Thiếu part_id`);
                }
                if (part.quantity && (part.quantity < 1 || !Number.isInteger(part.quantity))) {
                    errors.push(`Phụ tùng thứ ${index + 1}: Số lượng không hợp lệ`);
                }
            });
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        return {
            claim_id: this.claim_id,
            parts: this.parts.map(part => ({
                part_id: part.part_id?.trim(),
                part_serial: part.part_serial?.trim(),
                part_name: part.part_name?.trim(),
                quantity: part.quantity || 1,
                status: 'ordered'
            })),
            repair_description: this.repair_description,
            start_date: this.start_date,
            status: 'waiting_parts'
        };
    }
}

export default CreateRepairOrderDto;
