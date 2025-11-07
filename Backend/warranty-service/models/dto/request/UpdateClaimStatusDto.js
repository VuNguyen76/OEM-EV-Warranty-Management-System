class UpdateClaimStatusDto {
    constructor(data) {
        this.status = data.status;
        this.resolution_comment = data.resolution_comment?.trim();
        this.reviewed_by = data.reviewed_by;
        this.actual_cost = data.actual_cost;
        this.repair_order_id = data.repair_order_id;
    }

    validate() {
        const errors = [];

        if (this.status && !['submitted', 'under_review', 'approved', 'in_progress', 'rejected', 'completed'].includes(this.status)) {
            errors.push('Trạng thái không hợp lệ');
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        const updateData = {};

        if (this.status) {
            updateData.status = this.status;
            updateData.reviewed_at = new Date();
        }
        if (this.resolution_comment) updateData.resolution_comment = this.resolution_comment;
        if (this.reviewed_by) updateData.reviewed_by = this.reviewed_by;
        if (this.actual_cost !== undefined) updateData.actual_cost = this.actual_cost;
        if (this.repair_order_id) updateData.repair_order_id = this.repair_order_id;

        return updateData;
    }
}

export default UpdateClaimStatusDto;