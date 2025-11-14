class UpdateShipmentDto {
    constructor(data) {
        this.status = data.status;
        this.delivery_date = data.delivery_date;
        this.tracking_number = data.tracking_number?.trim();
        this.carrier = data.carrier?.trim();
        this.cost = data.cost;
        this.notes = data.notes?.trim();
    }

    validate() {
        const errors = [];

        if (this.status && !['pending', 'in_transit', 'delivered', 'cancelled'].includes(this.status)) {
            errors.push('Trạng thái không hợp lệ');
        }

        if (this.cost !== undefined && this.cost < 0) {
            errors.push('Chi phí không được âm');
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        const updateData = {};

        if (this.status) {
            updateData.status = this.status;
            // Auto set delivery_date when status is delivered
            if (this.status === 'delivered' && !this.delivery_date) {
                updateData.delivery_date = new Date();
            }
        }
        if (this.delivery_date) updateData.delivery_date = this.delivery_date;
        if (this.tracking_number) updateData.tracking_number = this.tracking_number;
        if (this.carrier) updateData.carrier = this.carrier;
        if (this.cost !== undefined) updateData.cost = this.cost;
        if (this.notes !== undefined) updateData.notes = this.notes;

        return updateData;
    }
}

export default UpdateShipmentDto;
