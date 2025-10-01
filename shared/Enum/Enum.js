const Enum = require("enum");

class Enum {
    constructor() {
        this.values = values;
    }
    getValues() {
        return this.values;
    }
}
const RoleEnum = new Enum(["admin", "staff"]);

module.exports = RoleEnum;