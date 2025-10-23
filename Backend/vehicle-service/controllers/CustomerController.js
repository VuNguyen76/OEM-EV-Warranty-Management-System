import Customer from '../models/Customer.js';
import CreateCustomerDto from '../models/dto/request/CreateCustomer.js';
import CustomerResponseDto from '../models/dto/response/CustomerResponse.js';
import SearchDto from '../models/dto/request/SearchDto.js';

class CustomerController {
    static async getAllCustomers(req, res) {
        try {
            const searchDto = new SearchDto(req.query);
            const pagination = searchDto.getPagination();

            const customers = await Customer.find()
                .populate('registered_vehicles', 'vin brand model')
                .sort(pagination.sort)
                .skip(pagination.skip)
                .limit(pagination.limit);

            const responseData = customers.map(customer => new CustomerResponseDto(customer));

            res.json({
                success: true,
                data: responseData,
                count: responseData.length,
                page: searchDto.page,
                limit: searchDto.limit
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi lấy danh sách khách hàng',
                error: error.message
            });
        }
    }

    static async createCustomer(req, res) {
        try {
            const createDto = new CreateCustomerDto(req.body);
            const validation = createDto.validate();

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: validation.newErrors
                });
            }

            const customer = new Customer(createDto.toModel());
            await customer.save();

            const responseDto = new CustomerResponseDto(customer);
            res.status(201).json({
                success: true,
                message: 'Tạo khách hàng thành công',
                data: responseDto
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Lỗi tạo khách hàng',
                error: error.message
            });
        }
    }

    static async getCustomerById(req, res) {
        try {
            const { id } = req.params;
            const customer = await Customer.findById(id)
                .populate('registered_vehicles', 'vin brand model warranty_status');

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy khách hàng'
                });
            }

            const responseDto = new CustomerResponseDto(customer);
            res.json({
                success: true,
                data: responseDto
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi lấy thông tin khách hàng',
                error: error.message
            });
        }
    }

    static async updateCustomer(req, res) {
        try {
            const { id } = req.params;
            const updateDto = new CreateCustomerDto(req.body); // Dùng chung DTO
            const validation = updateDto.validate();

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: validation.newErrors
                });
            }

            const customer = await Customer.findByIdAndUpdate(
                id,
                updateDto.toModel(),
                { new: true, runValidators: true }
            );

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy khách hàng'
                });
            }

            const responseDto = new CustomerResponseDto(customer);
            res.json({
                success: true,
                message: 'Cập nhật khách hàng thành công',
                data: responseDto
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Lỗi cập nhật khách hàng',
                error: error.message
            });
        }
    }

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

    static async searchCustomers(req, res) {
        try {
            const searchDto = new SearchDto(req.query);

            if (!searchDto.q) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu từ khóa tìm kiếm'
                });
            }

            const customers = await Customer.find({
                $or: [
                    { full_name: { $regex: searchDto.q, $options: 'i' } },
                    { phone: { $regex: searchDto.q, $options: 'i' } },
                    { email: { $regex: searchDto.q, $options: 'i' } },
                    { person_id: { $regex: searchDto.q, $options: 'i' } }
                ]
            }).populate('registered_vehicles', 'vin brand model');

            const responseData = customers.map(customer => new CustomerResponseDto(customer));

            res.json({
                success: true,
                data: responseData,
                count: responseData.length
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