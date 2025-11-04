class CreateWarrantyClaimDto {
    constructor(data) {
        this.vin = data.vin?.trim();
        this.parts = Array.isArray(data.parts) ? data.parts : [];
        this.policy_id = data.policy_id;
        this.issue_description = data.issue_description?.trim();
        this.technician_id = data.technician_id;
        this.submitted_by = data.submitted_by;
        this.estimated_cost = data.estimated_cost || 0;
    }

    validate() {
        const errors = [];

        if (!this.vin) errors.push('Thiếu VIN xe');
        if (!Array.isArray(this.parts) || this.parts.length === 0) {
            errors.push('Thiếu thông tin phụ tùng cần thay thế');
        } else {
            this.parts.forEach((part, index) => {
                if (!part.part_id) {
                    errors.push(`Phụ tùng thứ ${index + 1}: Thiếu part_id`);
                }
                if (!part.part_serial) {
                    errors.push(`Phụ tùng thứ ${index + 1}: Thiếu part_serial`);
                }
                if (part.quantity && (part.quantity < 1 || !Number.isInteger(part.quantity))) {
                    errors.push(`Phụ tùng thứ ${index + 1}: Số lượng không hợp lệ`);
                }
            });
        }
        if (!this.issue_description) errors.push('Thiếu mô tả vấn đề');
        if (!this.submitted_by) errors.push('Thiếu thông tin người tạo yêu cầu');

        // VIN format validation
        if (this.vin && this.vin.length !== 17) {
            errors.push('VIN phải có đúng 17 ký tự');
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        return {
            vin: this.vin,
            parts: this.parts.map(part => ({
                part_id: part.part_id?.trim(),
                part_serial: part.part_serial?.trim(),
                part_name: part.part_name?.trim(),
                quantity: part.quantity || 1,
            })),
            policy_id: this.policy_id,
            issue_description: this.issue_description,
            service_center_id: this.service_center_id,
            technician_id: this.technician_id,
            submitted_by: this.submitted_by,
            submitted_at: new Date(),
            estimated_cost: this.estimated_cost,
            status: 'submitted'
        };
    }
}

export default CreateWarrantyClaimDto;
