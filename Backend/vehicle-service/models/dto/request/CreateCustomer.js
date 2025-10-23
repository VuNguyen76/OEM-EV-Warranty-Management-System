class CreateCustomerDto {
    constructor(data) {
        this.full_name = data.full_name?.trim();
        this.phone = data.phone?.trim();
        this.email = data.email?.trim();
        this.address = data.address?.trim();
        this.person_id = data.person_id?.trim();
        this.gender = data.gender;
    }

    validate() {
        const errors = [];
        if (!this.full_name) errors.push('Thiếu họ và tên');
        if (!this.phone) errors.push('Thiếu số điện thoại');

        if (this.email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(this.email)) {
            errors.push('Email không hợp lệ');
        }
        if (this.phone && !/^[0-9]{10,11}$/.test(this.phone)) {
            errors.push('Số điện thoại không hợp lệ');
        }
        if (this.person_id && !/^[0-9]{9,12}$/.test(this.person_id)) {
            errors.push('Số CCCD/CMND không hợp lệ');
        }
        if (this.gender && !['male', 'female', 'other'].includes(this.gender)) {
            errors.push('Giới tính không hợp lệ');
        }

        const newErrors = errors.join("\n");
        return { isValid: errors.length === 0, newErrors };
    }

    toModel() {
        return {
            full_name: this.full_name,
            phone: this.phone,
            email: this.email,
            address: this.address,
            person_id: this.person_id,
            gender: this.gender
        };
    }
}

export default CreateCustomerDto;