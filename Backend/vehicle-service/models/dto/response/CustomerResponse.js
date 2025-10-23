class CustomerResponseDto {
    constructor(data) {
        this.id = data._id;
        this.full_name = data.full_name;
        this.phone = data.phone;
        this.email = data.email;
        this.address = data.address;
    }
    toJSON() {
        return {
            id: this.id,
            full_name: this.full_name,
            phone: this.phone,
            email: this.email,
            address: this.address
        }
    }
}

export default CustomerResponseDto;