const mongoose = require("mongoose");
const BaseEntity = require("../Base/BaseEntity");
const Enum = require("../Enum/Enum");
const validator = require("validator");
const UserSchema = new mongoose.Schema({

    ...BaseEntity,
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password:
    {
        type: String,
        required: true,
        // No length validation here since password will be hashed
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
