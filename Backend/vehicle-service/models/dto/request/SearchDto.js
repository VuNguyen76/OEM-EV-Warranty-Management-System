class SearchDto {
    constructor(query) {
        this.q = query.q?.trim();
        this.page = query.page ? parseInt(query.page) : 1;
        this.limit = query.limit ? parseInt(query.limit) : 10;
        this.sort = query.sort || 'createdAt';
        this.order = query.order === 'asc' ? 1 : -1;
    }

    getMongoQuery() {
        if (!this.q) return {};

        return {
            $or: [
                { vin: { $regex: this.q, $options: 'i' } },
                { brand: { $regex: this.q, $options: 'i' } },
                { model: { $regex: this.q, $options: 'i' } },
                { registration_number: { $regex: this.q, $options: 'i' } }
            ]
        };
    }

    getPagination() {
        return {
            skip: (this.page - 1) * this.limit,
            limit: this.limit,
            sort: { [this.sort]: this.order }
        };
    }
}

export default SearchDto;