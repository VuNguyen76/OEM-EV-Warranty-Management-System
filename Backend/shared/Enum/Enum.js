// Role Enum cho User model
class RoleEnum {
    static getValues() {
        return [
            "admin",              // Quản trị viên hệ thống
            "service_staff",      // Nhân viên trung tâm dịch vụ
            "technician",         // Kỹ thuật viên
            "manufacturer_staff"  // Nhân viên hãng sản xuất
            // ✅ ĐÃ XÓA "customer" - khách hàng không có tài khoản
        ];
    }

    static ADMIN = "admin";
    static SERVICE_STAFF = "service_staff";
    static TECHNICIAN = "technician";
    static MANUFACTURER_STAFF = "manufacturer_staff";
}

module.exports = RoleEnum;