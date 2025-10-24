class PartsAttachedResponseDto {
    constructor(data) {
        this.id = data._id;
        this.vin = data.vin;
        this.part_id = data.part_id;
        this.serial_number = data.serial_number;
        this.part_name = data.part_name;
        this.category = data.category;
        this.install_date = data.install_date;
        this.remove_date = data.remove_date;
        this.status = data.status;
        this.warranty_policy_id = data.warranty_policy_id;
        this.failure_reason = data.failure_reason;
        this.created_at = data.createdAt;
        this.updated_at = data.updatedAt;
    }

    toJSON() {
        return {
            id: this.id,
            vin: this.vin,
            part_id: this.part_id,
            serial_number: this.serial_number,
            part_name: this.part_name,
            category: this.category,
            install_date: this.install_date,
            remove_date: this.remove_date,
            status: this.status,
            warranty_policy_id: this.warranty_policy_id,
            failure_reason: this.failure_reason,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

export default PartsAttachedResponseDto;