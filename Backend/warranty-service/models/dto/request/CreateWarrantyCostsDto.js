class CreateWarrantyCostsDto {
    constructor(data) {
        this.claim_id = data.claim_id;
        this.part_cost = data.part_cost || 0;
        this.labor_cost = data.labor_cost || 0;
        this.transport_cost = data.transport_cost || 0;
        this.other_costs = data.other_costs || 0;
        this.notes = data.notes?.trim();
    }

    validate() {
        const errors = [];

        if (!this.claim_id) {
            errors.push('Thiếu claim_id');
        }

        if (this.part_cost < 0) {
            errors.push('Chi phí phụ tùng không được âm');
        }

        if (this.labor_cost < 0) {
            errors.push('Chi phí nhân công không được âm');
        }

        if (this.transport_cost < 0) {
            errors.push('Chi phí vận chuyển không được âm');
        }

        if (this.other_costs < 0) {
            errors.push('Chi phí khác không được âm');
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        return {
            claim_id: this.claim_id,
            part_cost: this.part_cost,
            labor_cost: this.labor_cost,
            transport_cost: this.transport_cost,
            other_costs: this.other_costs,
            notes: this.notes
        };
    }
}

export default CreateWarrantyCostsDto;
