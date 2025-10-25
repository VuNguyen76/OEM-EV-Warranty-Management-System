class RepairOrderResponseDto {
    constructor(data) {
        this.id = data._id;
        this.order_code = data.order_code;
        this.claim_id = data.claim_id;
        this.part_id = data.part_id;
        this.repair_description = data.repair_description;
        this.start_date = data.start_date;
        this.end_date = data.end_date;
        this.status = data.status;
        this.completion_report = data.completion_report;
        this.created_at = data.createdAt;
        this.updated_at = data.updatedAt;

        // Handle populated claim
        if (typeof data.claim_id === 'object' && data.claim_id !== null) {
            this.claim = {
                claim_code: data.claim_id.claim_code,
                vin: data.claim_id.vin,
                service_center_id: data.claim_id.service_center_id,
                technician_id: data.claim_id.technician_id,
                actual_cost: data.claim_id.actual_cost,
                status: data.claim_id.status
            };
        }

        // Handle populated part
        if (typeof data.part_id === 'object' && data.part_id !== null) {
            this.part = {
                part_id: data.part_id.part_id || data.part_id._id,
                part_name: data.part_id.part_name,
                category: data.part_id.category,
                manufacturer: data.part_id.manufacturer
            };
        }
    }

    toJSON() {
        return {
            id: this.id,
            order_code: this.order_code,
            claim: this.claim || { claim_id: this.claim_id },
            part: this.part || { part_id: this.part_id },
            repair_description: this.repair_description,
            start_date: this.start_date,
            end_date: this.end_date,
            status: this.status,
            completion_report: this.completion_report,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

export default RepairOrderResponseDto;
