class ServiceRecordResponseDto {
    constructor(data) {
        this.id = data._id;
        this.vin = data.vin;
        this.service_center_id = data.service_center_id;
        this.technician_id = data.technician_id;
        this.service_type = data.service_type;
        this.description = data.description;
        this.date_in = data.date_in;
        this.date_out = data.date_out;
        this.duration_days = data.duration_days;
        this.cost = data.cost;
        this.status = data.status;
        this.attachments = data.attachments;
        this.created_at = data.createdAt;
        this.updated_at = data.updatedAt;
    }

    toJSON() {
        return {
            id: this.id,
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
            attachments: this.attachments,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

export default ServiceRecordResponseDto;