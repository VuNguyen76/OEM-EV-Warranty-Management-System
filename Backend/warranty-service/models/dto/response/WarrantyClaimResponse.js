class WarrantyClaimResponseDto {
    constructor(data) {
        this.id = data._id;
        this.claim_code = data.claim_code;
        this.vin = data.vin;
        this.part_serial = data.part_serial;
        this.policy_id = data.policy_id;
        this.issue_description = data.issue_description;
        this.diagnostic_report_url = data.diagnostic_report_url;
        this.service_center_id = data.service_center_id;
        this.technician_id = data.technician_id;
        this.submitted_by = data.submitted_by;
        this.submitted_at = data.submitted_at;
        this.reviewed_by = data.reviewed_by;
        this.reviewed_at = data.reviewed_at;
        this.status = data.status;
        this.resolution_comment = data.resolution_comment;
        this.estimated_cost = data.estimated_cost;
        this.actual_cost = data.actual_cost;
        this.repair_order_id = data.repair_order_id;
        this.attachments = data.attachments;
        this.created_at = data.createdAt;
        this.updated_at = data.updatedAt;
    }

    toJSON() {
        return {
            id: this.id,
            claim_code: this.claim_code,
            vin: this.vin,
            part_serial: this.part_serial,
            policy_id: this.policy_id,
            issue_description: this.issue_description,
            diagnostic_report_url: this.diagnostic_report_url,
            service_center_id: this.service_center_id,
            technician_id: this.technician_id,
            submitted_by: this.submitted_by,
            submitted_at: this.submitted_at,
            reviewed_by: this.reviewed_by,
            reviewed_at: this.reviewed_at,
            status: this.status,
            resolution_comment: this.resolution_comment,
            estimated_cost: this.estimated_cost,
            actual_cost: this.actual_cost,
            repair_order_id: this.repair_order_id,
            attachments: this.attachments,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

export default WarrantyClaimResponseDto;