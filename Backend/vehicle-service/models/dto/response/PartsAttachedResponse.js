class PartsAttachedResponseDto {
    constructor(data) {
        this.id = data._id;
        this.vin = data.vin;
        this.serial_number = data.serial_number;
        this.install_date = data.install_date;
        this.remove_date = data.remove_date;
        this.status = data.status;
        this.warranty_policy_id = data.warranty_policy_id;
        this.failure_reason = data.failure_reason;
        this.created_at = data.createdAt;
        this.updated_at = data.updatedAt;

        // Handle populated part_id (can be ObjectId or populated object)
        if (typeof data.part_id === 'object' && data.part_id !== null) {
            // Populated
            this.part = {
                part_id: data.part_id.part_id || data.part_id._id,
                part_name: data.part_id.part_name,
                category: data.part_id.category,
                manufacturer: data.part_id.manufacturer,
                model_number: data.part_id.model_number,
                specifications: data.part_id.specifications
            };
        } else {
            // Not populated, just ID
            this.part = {
                part_id: data.part_id
            };
        }
    }

    toJSON() {
        return {
            id: this.id,
            vin: this.vin,
            serial_number: this.serial_number,
            part: this.part,
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