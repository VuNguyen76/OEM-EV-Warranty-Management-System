class InventoryResponseDto {
    constructor(data) {
        this.id = data._id;
        this.part_id = data.part_id;
        this.quantity = data.quantity;
        this.threshold = data.threshold;
        this.last_restocked_at = data.last_restocked_at;
        this.created_at = data.createdAt;
        this.updated_at = data.updatedAt;
    }

    toJSON() {
        return {
            id: this.id,
            part_id: this.part_id,
            quantity: this.quantity,
            threshold: this.threshold,
            last_restocked_at: this.last_restocked_at,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

export default InventoryResponseDto;
