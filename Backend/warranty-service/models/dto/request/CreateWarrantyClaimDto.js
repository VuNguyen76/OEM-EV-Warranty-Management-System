class CreateWarrantyClaimDto {
    constructor(data) {
        this.vin = data.vin?.trim();
        this.part_serial = data.part_serial?.trim();
        this.policy_id = data.policy_id;
        this.issue_description = data.issue_description?.trim();
        this.diagnostic_report_url = data.diagnostic_report_url?.trim();
        this.service_center_id = data.service_center_id;
        this.technician_id = data.technician_id;
        this.submitted_by = data.submitted_by;
        this.estimated_cost = data.estimated_cost || 0;
        this.attachments = data.attachments || [];
    }

    validate() {
        const errors = [];

        if (!this.vin) errors.push('Thiếu VIN xe');
        if (!this.part_serial) errors.push('Thiếu số seri phụ tùng');
        if (!this.issue_description) errors.push('Thiếu mô tả vấn đề');
        if (!this.service_center_id) errors.push('Thiếu mã trung tâm dịch vụ');
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
            part_serial: this.part_serial,
            policy_id: this.policy_id,
            issue_description: this.issue_description,
            diagnostic_report_url: this.diagnostic_report_url,
            service_center_id: this.service_center_id,
            technician_id: this.technician_id,
            submitted_by: this.submitted_by,
            submitted_at: new Date(),
            estimated_cost: this.estimated_cost,
            attachments: this.attachments,
            status: 'submitted'
        };
    }
}

export default CreateWarrantyClaimDto;
