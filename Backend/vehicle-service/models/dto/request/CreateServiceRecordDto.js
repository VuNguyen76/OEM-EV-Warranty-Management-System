class CreateServiceRecordDto {
    constructor(data) {
        this.vin = data.vin?.trim();
        this.service_center_id = data.service_center_id;
        this.technician_id = data.technician_id;
        this.service_type = data.service_type;
        this.description = data.description?.trim();
        this.date_in = data.date_in;
        this.date_out = data.date_out;
        this.duration_days = data.duration_days;
        this.cost = data.cost || 0;
        this.status = data.status || 'pending';
        this.attachments = data.attachments || [];
    }

    validate() {
        const errors = [];

        if (!this.vin) errors.push('Thiếu VIN xe');
        if (!this.service_center_id) errors.push('Thiếu mã trung tâm dịch vụ');
        if (!this.service_type) errors.push('Thiếu loại dịch vụ');
        if (!this.description) errors.push('Thiếu mô tả công việc');
        if (!this.date_in) errors.push('Thiếu ngày xe vào xưởng');
        if (!this.date_out) errors.push('Thiếu ngày hoàn thành');

        if (this.service_type && !['warranty', 'maintenance', 'recall', 'repair'].includes(this.service_type)) {
            errors.push('Loại dịch vụ không hợp lệ');
        }

        if (this.status && !['pending', 'in_progress', 'completed', 'cancelled'].includes(this.status)) {
            errors.push('Trạng thái không hợp lệ');
        }

        if (this.date_in && this.date_out && new Date(this.date_in) > new Date(this.date_out)) {
            errors.push('Ngày hoàn thành phải sau ngày vào xưởng');
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        return {
            vin: this.vin,
            service_center_id: this.service_center_id,
            technician_id: this.technician_id,
            service_type: this.service_type,
            description: this.description,
            date_in: this.date_in,
            date_out: this.date_out,
            duration_days: this.duration_days,
            cost: this.cost,
            status: this.status,
            attachments: this.attachments
        };
    }
}

export default CreateServiceRecordDto;