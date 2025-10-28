class ShipmentResponseDto {
    constructor(data) {
        this.id = data._id;
        this.shipment_code = data.shipment_code;
        this.claim_id = data.claim_id;
        this.from_location_id = data.from_location_id;
        this.to_location_id = data.to_location_id;
        this.parts_list = data.parts_list;
        this.ship_date = data.ship_date;
        this.delivery_date = data.delivery_date;
        this.status = data.status;
        this.tracking_number = data.tracking_number;
        this.carrier = data.carrier;
        this.cost = data.cost;
        this.notes = data.notes;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    toJSON() {
        return {
            id: this.id,
            shipment_code: this.shipment_code,
            claim_id: this.claim_id,
            from_location_id: this.from_location_id,
            to_location_id: this.to_location_id,
            parts_list: this.parts_list,
            ship_date: this.ship_date,
            delivery_date: this.delivery_date,
            status: this.status,
            tracking_number: this.tracking_number,
            carrier: this.carrier,
            cost: this.cost,
            notes: this.notes,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

export default ShipmentResponseDto;
