class CreatePartsAttachedDto {
    constructor(data) {
        this.vin = data.vin?.trim();
        this.part_id = data.part_id?.trim();
        this.serial_number = data.serial_number?.trim();
        this.part_name = data.part_name?.trim();
        this.category = data.category;
        this.install_date = data.install_date;
        this.remove_date = data.remove_date;
        this.status = data.status || 'active';
        this.warranty_policy_id = data.warranty_policy_id?.trim();
        this.failure_reason = data.failure_reason?.trim();
    }

    validate() {
        const errors = [];

        if (!this.vin) errors.push('Thiếu VIN xe');
        if (!this.part_id) errors.push('Thiếu mã phụ tùng');
        if (!this.serial_number) errors.push('Thiếu số seri');
        if (!this.part_name) errors.push('Thiếu tên phụ tùng');
        if (!this.install_date) errors.push('Thiếu ngày lắp đặt');

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
        return {
            vin: this.vin,
            part_id: this.part_id,
            serial_number: this.serial_number,
            part_name: this.part_name,
            category: this.category,
            install_date: this.install_date,
            remove_date: this.remove_date,
            status: this.status,
            warranty_policy_id: this.warranty_policy_id,
            failure_reason: this.failure_reason
        };
    }
}

export default CreatePartsAttachedDto;