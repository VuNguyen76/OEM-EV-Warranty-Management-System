class UpdatePartDto {
    constructor(data) {
        this.vehicle_id = data.vehicle_id?.trim();
        this.install_date = data.install_date ? new Date(data.install_date) : undefined;
        this.warranty_end = data.warranty_end ? new Date(data.warranty_end) : undefined;
        this.status = data.status;
    }

    validate() {
        const errors = [];

        if (this.install_date && isNaN(this.install_date.getTime())) {
            errors.push('Ngày lắp đặt không hợp lệ');
        }

        if (this.warranty_end && isNaN(this.warranty_end.getTime())) {
            errors.push('Ngày hết hạn bảo hành không hợp lệ');
        }

        if (this.status && !['active', 'replaced', 'defective'].includes(this.status)) {
            errors.push('Trạng thái không hợp lệ');
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        const updateData = {};

        if (this.vehicle_id !== undefined) updateData.vehicle_id = this.vehicle_id || null;
        if (this.install_date !== undefined) updateData.install_date = this.install_date;
        if (this.warranty_end !== undefined) updateData.warranty_end = this.warranty_end;
        if (this.status) updateData.status = this.status;

        return updateData;
    }
}

export default UpdatePartDto;
