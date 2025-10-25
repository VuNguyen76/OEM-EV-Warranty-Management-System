import WarrantyCosts from '../models/WarrantyCosts.js';
import WarrantyClaim from '../models/WarrantyClaim.js';
import CreateWarrantyCostsDto from '../models/dto/request/CreateWarrantyCostsDto.js';
import UpdateWarrantyCostsDto from '../models/dto/request/UpdateWarrantyCostsDto.js';
import WarrantyCostsResponseDto from '../models/dto/response/WarrantyCostsResponse.js';

class WarrantyCostsController {
    // POST /api/warranty-costs - Tạo cost breakdown
    static async createWarrantyCosts(req, res) {
        try {
            const createDto = new CreateWarrantyCostsDto(req.body);
            const validation = createDto.validate();

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: validation.newErrors
                });
            }

            // Verify claim exists
            const claim = await WarrantyClaim.findById(createDto.claim_id);
            if (!claim) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy warranty claim'
                });
            }

            // Check if costs already exist for this claim
            const existingCosts = await WarrantyCosts.findOne({ claim_id: createDto.claim_id });
            if (existingCosts) {
                return res.status(400).json({
                    success: false,
                    message: 'Chi phí đã tồn tại cho claim này. Sử dụng PUT để cập nhật.'
                });
            }

            const warrantyCosts = new WarrantyCosts(createDto.toModel());
            await warrantyCosts.save();

            res.status(201).json({
                success: true,
                message: 'Tạo chi phí bảo hành thành công',
                total_cost: warrantyCosts.total_cost
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Lỗi tạo chi phí bảo hành',
                error: error.message
            });
        }
    }

    // GET /api/warranty-costs/claim/:claim_id - Lấy costs theo claim
    static async getCostsByClaim(req, res) {
        try {
            const { claim_id } = req.params;

            const costs = await WarrantyCosts.findOne({ claim_id })
                .populate('claim_id', 'claim_code vin status');

            if (!costs) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy chi phí cho claim này'
                });
            }

            const responseDto = new WarrantyCostsResponseDto(costs);
            res.json({
                success: true,
                data: responseDto
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi lấy thông tin chi phí',
                error: error.message
            });
        }
    }

    // PUT /api/warranty-costs/claim/:claim_id - Cập nhật costs
    static async updateWarrantyCosts(req, res) {
        try {
            const { claim_id } = req.params;
            const updateDto = new UpdateWarrantyCostsDto(req.body);
            const validation = updateDto.validate();

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: validation.newErrors
                });
            }

            const costs = await WarrantyCosts.findOneAndUpdate(
                { claim_id },
                updateDto.toModel(),
                { new: true, runValidators: true }
            );

            if (!costs) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy chi phí'
                });
            }

            res.json({
                success: true,
                message: 'Cập nhật chi phí thành công',
                total_cost: costs.total_cost
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Lỗi cập nhật chi phí',
                error: error.message
            });
        }
    }

    // GET /api/analytics/costs - Thống kê chi phí
    static async getCostsAnalytics(req, res) {
        try {
            const { period = 'month', year, month } = req.query;

            // Build date filter
            const dateFilter = {};
            if (year) {
                const startDate = new Date(year, month ? month - 1 : 0, 1);
                const endDate = month
                    ? new Date(year, month, 0, 23, 59, 59)
                    : new Date(year, 11, 31, 23, 59, 59);

                dateFilter.createdAt = { $gte: startDate, $lte: endDate };
            }

            // Aggregate costs
            const totalStats = await WarrantyCosts.aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: null,
                        total_part_cost: { $sum: '$part_cost' },
                        total_labor_cost: { $sum: '$labor_cost' },
                        total_transport_cost: { $sum: '$transport_cost' },
                        total_other_costs: { $sum: '$other_costs' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            const stats = totalStats[0] || {
                total_part_cost: 0,
                total_labor_cost: 0,
                total_transport_cost: 0,
                total_other_costs: 0,
                count: 0
            };

            const grand_total = stats.total_part_cost + stats.total_labor_cost +
                stats.total_transport_cost + stats.total_other_costs;

            // Get costs by month (if yearly view)
            let byMonth = [];
            if (year && !month) {
                byMonth = await WarrantyCosts.aggregate([
                    { $match: dateFilter },
                    {
                        $group: {
                            _id: { $month: '$createdAt' },
                            total: {
                                $sum: {
                                    $add: ['$part_cost', '$labor_cost', '$transport_cost', '$other_costs']
                                }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]);
            }

            res.json({
                success: true,
                period: month ? `${year}-${month}` : year || 'all',
                summary: {
                    total_claims: stats.count,
                    breakdown: {
                        part_cost: stats.total_part_cost,
                        labor_cost: stats.total_labor_cost,
                        transport_cost: stats.total_transport_cost,
                        other_costs: stats.total_other_costs
                    },
                    grand_total
                },
                by_month: byMonth.map(m => ({
                    month: m._id,
                    total: m.total,
                    count: m.count
                }))
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi lấy thống kê',
                error: error.message
            });
        }
    }

    // GET /api/analytics/costs/by-part - Thống kê theo part category
    static async getCostsByPart(req, res) {
        try {
            const { year, month } = req.query;

            const dateFilter = {};
            if (year) {
                const startDate = new Date(year, month ? month - 1 : 0, 1);
                const endDate = month
                    ? new Date(year, month, 0, 23, 59, 59)
                    : new Date(year, 11, 31, 23, 59, 59);

                dateFilter.createdAt = { $gte: startDate, $lte: endDate };
            }

            const byPart = await WarrantyCosts.aggregate([
                { $match: dateFilter },
                {
                    $lookup: {
                        from: 'warrantyclaims',
                        localField: 'claim_id',
                        foreignField: '_id',
                        as: 'claim'
                    }
                },
                { $unwind: '$claim' },
                {
                    $lookup: {
                        from: 'warrantypolicies',
                        localField: 'claim.policy_id',
                        foreignField: '_id',
                        as: 'policy'
                    }
                },
                { $unwind: '$policy' },
                {
                    $group: {
                        _id: '$policy.part_category',
                        total_cost: {
                            $sum: {
                                $add: ['$part_cost', '$labor_cost', '$transport_cost', '$other_costs']
                            }
                        },
                        avg_cost: {
                            $avg: {
                                $add: ['$part_cost', '$labor_cost', '$transport_cost', '$other_costs']
                            }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { total_cost: -1 } }
            ]);

            res.json({
                success: true,
                data: byPart.map(item => ({
                    part_category: item._id,
                    total_cost: item.total_cost,
                    avg_cost: Math.round(item.avg_cost),
                    claim_count: item.count
                }))
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi lấy thống kê theo part',
                error: error.message
            });
        }
    }
}

export default WarrantyCostsController;
