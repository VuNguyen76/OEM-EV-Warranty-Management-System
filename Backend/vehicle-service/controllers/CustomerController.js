import Customer from '../models/Customer.js';

class CustomerController {
    // Lấy tất cả khách hàng
    static async getAllCustomers(req, res) {
        try {
            const customers = await Customer.find()
                .populate('registered_vehicles', 'vin brand model')
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                data: customers,
                count: customers.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi lấy danh sách khách hàng',
                error: error.message
            });
        }
    }

    // Tạo khách hàng mới
    static async createCustomer(req, res) {
        try {
            const customer = new Customer(req.body);
            await customer.save();

            res.status(201).json({
                success: true,
                message: 'Tạo khách hàng thành công',
                data: customer
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Lỗi tạo khách hàng',
                error: error.message
            });
        }
    }

    // Lấy khách hàng theo ID
    static async getCustomerById(req, res) {
        try {
            const { id } = req.params;
            const customer = await Customer.findById(id)
                .populate('registered_vehicles');

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy khách hàng'
                });
            }

            res.json({
                success: true,
                data: customer
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi lấy thông tin khách hàng',
                error: error.message
            });
        }
    }

    // Cập nhật khách hàng
    static async updateCustomer(req, res) {
        try {
            const { id } = req.params;
            const customer = await Customer.findByIdAndUpdate(
                id,
                req.body,
                { new: true, runValidators: true }
            );

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy khách hàng'
                });
            }

            res.json({
                success: true,
                message: 'Cập nhật khách hàng thành công',
                data: customer
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Lỗi cập nhật khách hàng',
                error: error.message
            });
        }
    }

    // Xóa khách hàng
    static async deleteCustomer(req, res) {
        try {
            const { id } = req.params;
            const customer = await Customer.findByIdAndDelete(id);

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy khách hàng'
                });
            }

            res.json({
                success: true,
                message: 'Xóa khách hàng thành công'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi xóa khách hàng',
                error: error.message
            });
        }
    }

    // Tìm kiếm khách hàng
    static async searchCustomers(req, res) {
        try {
            const { q } = req.query;
            if (!q) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu từ khóa tìm kiếm'
                });
            }

            const customers = await Customer.find({
                $or: [
                    { full_name: { $regex: q, $options: 'i' } },
                    { phone: { $regex: q, $options: 'i' } },
                    { email: { $regex: q, $options: 'i' } },
                    { person_id: { $regex: q, $options: 'i' } }
                ]
            }).populate('registered_vehicles', 'vin brand model');

            res.json({
                success: true,
                data: customers,
                count: customers.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi tìm kiếm khách hàng',
                error: error.message
            });
        }
    }
}

export default CustomerController;