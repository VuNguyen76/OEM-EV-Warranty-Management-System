class CustomerResponseDto {
    constructor(data) {
        this.id = data._id;
        this.full_name = data.full_name;
        this.phone = data.phone;
        this.email = data.email;
        this.address = data.address;
        this.person_id = data.person_id;
        this.gender = data.gender;
        this.registered_vehicles = data.registered_vehicles || [];
        this.created_at = data.createdAt;
        this.updated_at = data.updatedAt;
    }
    toJSON() {
        return {
            _id: this.id,
            full_name: this.full_name,
            phone: this.phone,
            email: this.email,
            address: this.address,
            person_id: this.person_id,
            gender: this.gender,
            registered_vehicles: this.registered_vehicles,
            created_at: this.created_at,
            updated_at: this.updated_at
        }
    }
}

export default CustomerResponseDto;