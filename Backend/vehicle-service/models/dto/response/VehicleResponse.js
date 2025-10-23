class VehicleResponseDto {
    constructor(data) {
        this.id = data._id;
        this.vin = data.vin;
        this.brand = data.brand;
        this.model = data.model;
        this.manufacture_year = data.manufacture_year;
        this.color = data.color;
        this.battery_capacity = data.battery_capacity;
        this.registration_number = data.registration_number;
        this.warranty_start = data.warranty_start;
        this.warranty_end = data.warranty_end;
        this.warranty_status = data.warranty_status;
        this.current_mileage = data.current_mileage;
        this.status = data.status;
        this.notes = data.notes;
        this.created_at = data.createdAt;
        this.updated_at = data.updatedAt;
    }

    toJSON() {
        return {
            id: this.id,
            vin: this.vin,
            brand: this.brand,
            model: this.model,
            manufacture_year: this.manufacture_year,
            color: this.color,
            battery_capacity: this.battery_capacity,
            registration_number: this.registration_number,
            warranty_start: this.warranty_start,
            warranty_end: this.warranty_end,
            warranty_status: this.warranty_status,
            current_mileage: this.current_mileage,
            status: this.status,
            notes: this.notes,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

export default VehicleResponseDto;