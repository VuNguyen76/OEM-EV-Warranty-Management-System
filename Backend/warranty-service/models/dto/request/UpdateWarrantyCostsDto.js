class UpdateWarrantyCostsDto {
    constructor(data) {
        this.part_cost = data.part_cost;
        this.labor_cost = data.labor_cost;
        this.transport_cost = data.transport_cost;
        this.other_costs = data.other_costs;
        this.notes = data.notes?.trim();
    }

    validate() {
        const errors = [];

        if (this.part_cost !== undefined && this.part_cost < 0) {
            errors.push('Chi phí phụ tùng không được âm');
        }

        if (this.labor_cost !== undefined && this.labor_cost < 0) {
            errors.push('Chi phí nhân công không được âm');
        }

        if (this.transport_cost !== undefined && this.transport_cost < 0) {
            errors.push('Chi phí vận chuyển không được âm');
        }

        if (this.other_costs !== undefined && this.other_costs < 0) {
            errors.push('Chi phí khác không được âm');
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        const updateData = {};

        if (this.part_cost !== undefined) updateData.part_cost = this.part_cost;
        if (this.labor_cost !== undefined) updateData.labor_cost = this.labor_cost;
        if (this.transport_cost !== undefined) updateData.transport_cost = this.transport_cost;
        if (this.other_costs !== undefined) updateData.other_costs = this.other_costs;
        if (this.notes !== undefined) updateData.notes = this.notes;

        return updateData;
    }
}

export default UpdateWarrantyCostsDto;
