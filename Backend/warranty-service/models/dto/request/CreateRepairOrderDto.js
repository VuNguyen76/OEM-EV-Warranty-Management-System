class CreateRepairOrderDto {
    constructor(data) {
        this.claim_id = data.claim_id;
        this.part_id = data.part_id?.trim();
        this.repair_description = data.repair_description?.trim();
        this.start_date = data.start_date || new Date();
    }

    validate() {
        const errors = [];

        if (!this.claim_id) {
            errors.push('Thiếu claim_id');
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        return {
            claim_id: this.claim_id,
            part_id: this.part_id,
            repair_description: this.repair_description,
            start_date: this.start_date,
            status: 'waiting_parts'
        };
    }
}

export default CreateRepairOrderDto;
