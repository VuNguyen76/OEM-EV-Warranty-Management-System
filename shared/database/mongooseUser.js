const mongoose = require("mongoose");
const BaseEntity = require("../Base/BaseEntity");
const Enum = require("../Enum/Enum");
const validator = require("validator");
class User extends BaseEntity {
    constructor() {
        BaseEntity.constructor(id, createdAt, updatedAt, note, status);
        this.username = username;
        this.password = password;
        this.email = email;
        this.role = role;
    }
}
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password:
    {
        type: String,
        required: true,
        minlength: 6,
        maxlength: 20,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: validator.isEmail,
            message: "Please provide a valid email",
        },
    },
    role: {
        type: String,
        enum: Enum.getValues(),
        default: "staff",
    },
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
