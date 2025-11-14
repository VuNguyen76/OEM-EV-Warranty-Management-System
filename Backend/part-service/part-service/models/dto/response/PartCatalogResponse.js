class PartCatalogResponseDto {
    constructor(data) {
        this.id = data._id;
        this.name = data.name;
        this.category = data.category;
        this.manufacturer = data.manufacturer;
        this.model_code = data.model_code;
        this.cost_price = data.cost_price;
        this.weight_kg = data.weight_kg;
        this.dimensions = data.dimensions || null;
        this.description = data.description || null;
        this.image_url = data.image_url || null;
        this.status = data.status;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            category: this.category,
            manufacturer: this.manufacturer,
            model_code: this.model_code,
            cost_price: this.cost_price,
            weight_kg: this.weight_kg,
            dimensions: this.dimensions,
            description: this.description,
            image_url: this.image_url,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

export default PartCatalogResponseDto;




