class PartResponseDto {
    constructor(data) {
        this.id = data._id;
        this.part_id = data.part_id;
        this.name = data.name;
        this.category = data.category;
        this.manufacturer = data.manufacturer;
        this.model_compatible = data.model_compatible;
        this.warranty_policy_code = data.warranty_policy_code;
        this.cost_price = data.cost_price;
        this.weight_kg = data.weight_kg;
        this.dimensions = data.dimensions;
        this.description = data.description;
        this.image_url = data.image_url;
        this.status = data.status;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    toJSON() {
        return {
            id: this.id,
            part_id: this.part_id,
            name: this.name,
            category: this.category,
            manufacturer: this.manufacturer,
            model_compatible: this.model_compatible,
            warranty_policy_code: this.warranty_policy_code,
            cost_price: this.cost_price,
            weight_kg: this.weight_kg,
            dimensions: this.dimensions,
            description: this.description,
            image_url: this.image_url,
            status: this.status,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

export default PartResponseDto;
