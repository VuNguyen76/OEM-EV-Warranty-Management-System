// api-gateway/services/AuthorizationService.js

/**
 * Service phân quyền người dùng
 */
class AuthorizationService {
    /**
     * Middleware kiểm tra role của user
     * @param {String|Array} allowedRoles - Role được phép (string hoặc array)
     */
    authorizeRole(allowedRoles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Chưa xác thực'
                });
            }

            const userRole = req.user.role;
            const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

            if (!roles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền truy cập'
                });
            }

            next();
        };
    }

    /**
     * Middleware kiểm tra quyền admin
     */
    requireAdmin() {
        return this.authorizeRole('admin');
    }

    /**
     * Middleware kiểm tra quyền manager hoặc admin
     */
    requireManager() {
        return this.authorizeRole(['admin', 'manager']);
    }
}

module.exports = AuthorizationService;