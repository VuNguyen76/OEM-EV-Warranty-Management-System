// BaseEntity.js
const BaseEntitySchema = {
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    note: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["active", "inactive", "deleted"],
        default: "active"
    }
};

module.exports = {
    BaseEntity: BaseEntitySchema
};