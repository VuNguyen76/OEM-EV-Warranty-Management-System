class UpdateServiceRecordDto {
    constructor(data) {
        this.technician_id = data.technician_id;
        this.description = data.description?.trim();
        this.date_out = data.date_out;
        this.duration_days = data.duration_days;
        this.cost = data.cost;
        this.status = data.status;
        this.attachments = data.attachments;
    }

    validate() {
        const errors = [];

        if (this.status && !['pending', 'in_progress', 'completed', 'cancelled'].includes(this.status)) {
            errors.push('Trạng thái không hợp lệ');
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        const updateData = {};

        if (this.technician_id) updateData.technician_id = this.technician_id;
        if (this.description) updateData.description = this.description;
        if (this.date_out) updateData.date_out = this.date_out;
        if (this.duration_days !== undefined) updateData.duration_days = this.duration_days;
        if (this.cost !== undefined) updateData.cost = this.cost;
        if (this.status) updateData.status = this.status;
        if (this.attachments) updateData.attachments = this.attachments;

        return updateData;
    }
}

export default UpdateServiceRecordDto;