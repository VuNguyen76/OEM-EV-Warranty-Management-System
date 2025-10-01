// Role Enum cho User model
class RoleEnum {
    static getValues() {
        return ["admin", "staff", "user"];
    }

    static ADMIN = "admin";
    static STAFF = "staff";
    static USER = "user";
}

module.exports = RoleEnum;