class UpdatePartsAttachedDto {
    constructor(data) {
        this.category = data.category;
        this.remove_date = data.remove_date;
        this.status = data.status;
        this.warranty_policy_id = data.warranty_policy_id?.trim();
        this.failure_reason = data.failure_reason?.trim();
    }

    validate() {
        const errors = [];

        if (this.category && !['battery', 'motor', 'bms', 'charger', 'inverter'].includes(this.category)) {
            errors.push('Nhóm linh kiện không hợp lệ');
        }
        if (this.status && !['active', 'replaced', 'faulty'].includes(this.status)) {
            errors.push('Trạng thái không hợp lệ');
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        const updateData = {};

        if (this.category) updateData.category = this.category;
        if (this.remove_date) updateData.remove_date = this.remove_date;
        if (this.status) updateData.status = this.status;
        if (this.warranty_policy_id) updateData.warranty_policy_id = this.warranty_policy_id;
        if (this.failure_reason) updateData.failure_reason = this.failure_reason;

        return updateData;
    }
}

export default UpdatePartsAttachedDto;