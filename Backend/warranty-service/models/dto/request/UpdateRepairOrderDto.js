class UpdateRepairOrderDto {
    constructor(data) {
        this.status = data.status;
        this.completion_report = data.completion_report?.trim();
        this.end_date = data.end_date;
    }

    validate() {
        const errors = [];
        const validStatuses = ['waiting_parts', 'in_progress', 'completed', 'cancelled'];

        if (this.status && !validStatuses.includes(this.status)) {
            errors.push('Trạng thái không hợp lệ');
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        const updateData = {};

        if (this.status) {
            updateData.status = this.status;

            // Auto set end_date when completed
            if (this.status === 'completed' && !this.end_date) {
                updateData.end_date = new Date();
            }
        }

        if (this.completion_report) {
            updateData.completion_report = this.completion_report;
        }

        if (this.end_date) {
            updateData.end_date = this.end_date;
        }

        return updateData;
    }
}

export default UpdateRepairOrderDto;
