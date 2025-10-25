class WarrantyCostsResponseDto {
    constructor(data) {
        this.id = data._id;
        this.claim_id = data.claim_id;
        this.part_cost = data.part_cost;
        this.labor_cost = data.labor_cost;
        this.transport_cost = data.transport_cost;
        this.other_costs = data.other_costs;
        this.total_cost = data.total_cost;
        this.notes = data.notes;
        this.created_at = data.createdAt;
        this.updated_at = data.updatedAt;

        // Handle populated claim
        if (typeof data.claim_id === 'object' && data.claim_id !== null) {
            this.claim = {
                claim_code: data.claim_id.claim_code,
                vin: data.claim_id.vin,
                status: data.claim_id.status
            };
        }
    }

    toJSON() {
        return {
            id: this.id,
            claim: this.claim || { claim_id: this.claim_id },
            breakdown: {
                part_cost: this.part_cost,
                labor_cost: this.labor_cost,
                transport_cost: this.transport_cost,
                other_costs: this.other_costs
            },
            total_cost: this.total_cost,
            notes: this.notes,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

export default WarrantyCostsResponseDto;
