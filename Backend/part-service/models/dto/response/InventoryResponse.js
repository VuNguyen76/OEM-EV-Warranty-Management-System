class InventoryResponseDto {
    constructor(data) {
        this.id = data._id;
        this.part_catalog_id = data.part_catalog_id;
        this.part_name = data.part_catalog_id.name;
        this.category = data.part_catalog_id.category;
        this.quantity = data.quantity;
        this.threshold = data.threshold;
        this.last_updated = data.last_updated;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    toJSON() {
        return {
            id: this.id,
            part_catalog_id: this.part_catalog_id,
            part_name: this.part_name,
            category: this.category,
            quantity: this.quantity,
            threshold: this.threshold,
            last_updated: this.last_updated,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

export default InventoryResponseDto;
