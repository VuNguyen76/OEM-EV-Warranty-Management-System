class CreateShipmentDto {
    constructor(data) {
        this.claim_id = data.claim_id;
        this.from_location_id = data.from_location_id || 'EVM_HCM';
        this.to_location_id = data.to_service_center_id?.trim();
        this.parts_list = data.parts_list || [];
        this.tracking_number = data.tracking_number?.trim();
        this.carrier = data.carrier?.trim();
        this.notes = data.notes?.trim();
    }

    validate() {
        const errors = [];

        if (!this.claim_id) errors.push('Thiếu mã bảo hành');
        if (!this.to_location_id) errors.push('Thiếu địa điểm giao hàng');
        if (!this.parts_list || this.parts_list.length === 0) {
            errors.push('Thiếu danh sách phụ tùng');
        }

        // Validate parts_list
        if (this.parts_list && this.parts_list.length > 0) {
            this.parts_list.forEach((item, index) => {
                if (!item.part_id) {
                    errors.push(`Phụ tùng thứ ${index + 1}: Thiếu mã phụ tùng`);
                }
                if (!item.quantity || item.quantity <= 0) {
                    errors.push(`Phụ tùng thứ ${index + 1}: Số lượng không hợp lệ`);
                }
            });
        }

        const newErrors = errors.join('\n');
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        // Auto-generate shipment_code
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const shipment_code = `SHIP-${timestamp}-${random}`;

        return {
            shipment_code,
            claim_id: this.claim_id,
            from_location_id: this.from_location_id,
            to_location_id: this.to_location_id,
            parts_list: this.parts_list,
            tracking_number: this.tracking_number,
            carrier: this.carrier,
            notes: this.notes,
            status: 'pending',
            ship_date: new Date()
        };
    }
}

export default CreateShipmentDto;
