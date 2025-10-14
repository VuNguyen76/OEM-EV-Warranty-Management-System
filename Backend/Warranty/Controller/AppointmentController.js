const responseHelper = require('../../shared/utils/responseHelper');
const { handleControllerError } = require('../../shared/utils/errorHelper');
const AppointmentModel = require('../Model/Appointment');
const RecallCampaignModel = require('../Model/RecallCampaign');
const EmailService = require('../../shared/services/EmailService');

/**
 * UC15: Appointment Controller
 * Quản lý lịch hẹn cho các chiến dịch recall
 */

/**
 * UC15.1: Tạo lịch hẹn mới
 * POST /appointments
 * Role: service_staff, admin
 */
const createAppointment = async (req, res) => {
    try {
        const {
            campaignId,
            vin,
            appointmentDate,
            timeSlot,
            customerNotes,
            assignedTechnician
        } = req.body;

        // Validation
        if (!campaignId) {
            return responseHelper.error(res, "Campaign ID là bắt buộc", 400);
        }

        if (!vin) {
            return responseHelper.error(res, "VIN là bắt buộc", 400);
        }

        if (!appointmentDate) {
            return responseHelper.error(res, "Ngày hẹn là bắt buộc", 400);
        }

        if (!timeSlot || !timeSlot.startTime || !timeSlot.endTime) {
            return responseHelper.error(res, "Khung giờ hẹn là bắt buộc", 400);
        }

        // Validate appointment date is in the future
        const appointmentDateTime = new Date(appointmentDate);
        if (appointmentDateTime <= new Date()) {
            return responseHelper.error(res, "Ngày hẹn phải trong tương lai", 400);
        }

        // Get campaign info
        const RecallCampaign = RecallCampaignModel();
        const campaign = await RecallCampaign.findById(campaignId);

        if (!campaign) {
            return responseHelper.error(res, "Không tìm thấy chiến dịch recall", 404);
        }

        if (!['active', 'in_progress'].includes(campaign.status)) {
            return responseHelper.error(res, "Chỉ có thể đặt lịch cho chiến dịch đang hoạt động", 400);
        }

        // Find vehicle in campaign
        const vehicle = campaign.affectedVehicles.find(v => v.vin === vin.toUpperCase());
        if (!vehicle) {
            return responseHelper.error(res, "Xe không thuộc chiến dịch này", 404);
        }

        if (vehicle.status === 'completed') {
            return responseHelper.error(res, "Xe đã hoàn thành recall", 400);
        }

        // Check if appointment already exists for this vehicle
        const Appointment = AppointmentModel();
        const existingAppointment = await Appointment.findOne({
            campaignId,
            vin: vin.toUpperCase(),
            status: { $in: ['scheduled', 'confirmed'] }
        });

        if (existingAppointment) {
            return responseHelper.error(res, "Xe đã có lịch hẹn cho chiến dịch này", 400);
        }

        // Get customer info from vehicle lookup service
        const { getVehicleOwnerInfo } = require('./WarrantyClaimController');
        const authToken = req.headers.authorization?.replace('Bearer ', '');
        const ownerInfo = await getVehicleOwnerInfo(vin, authToken);

        if (!ownerInfo) {
            return responseHelper.error(res, `Không tìm thấy thông tin chủ xe cho VIN ${vin}`, 404);
        }

        // Calculate duration
        const [startHour, startMin] = timeSlot.startTime.split(':').map(Number);
        const [endHour, endMin] = timeSlot.endTime.split(':').map(Number);
        const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);

        // Create appointment
        const appointment = new Appointment({
            campaignId,
            campaignCode: campaign.campaignCode,
            campaignName: campaign.campaignName,
            vin: vin.toUpperCase(),
            vehicleModel: ownerInfo.modelName || vehicle.model,
            customerName: ownerInfo.ownerName || 'Không xác định',
            customerPhone: ownerInfo.ownerPhone || 'Không có',
            customerEmail: ownerInfo.ownerEmail || 'Không có',
            customerAddress: ownerInfo.ownerAddress || '',
            appointmentDate: appointmentDateTime,
            timeSlot: {
                startTime: timeSlot.startTime,
                endTime: timeSlot.endTime,
                duration: duration
            },
            serviceCenterId: req.user.serviceCenterId || req.user.sub,
            serviceCenterName: req.user.serviceCenterName || 'Trung tâm dịch vụ',
            serviceCenterCode: req.user.serviceCenterCode || 'SC001',
            assignedTechnician: assignedTechnician || {},
            customerNotes: customerNotes || '',
            createdBy: req.user.email,
            createdByRole: req.user.role
        });

        await appointment.save();

        // Update vehicle status in campaign
        vehicle.status = 'scheduled';
        vehicle.scheduledDate = appointmentDateTime;
        vehicle.notes = `Đã đặt lịch hẹn: ${timeSlot.startTime} - ${timeSlot.endTime}`;

        campaign.updatedBy = req.user.email;
        await campaign.save();

        // Send confirmation email if customer has email
        if (ownerInfo.ownerEmail && ownerInfo.ownerEmail !== 'Không có') {
            try {
                await EmailService.initialize();

                const emailData = {
                    customerName: ownerInfo.ownerName,
                    appointmentId: appointment._id,
                    campaignName: campaign.campaignName,
                    vehicleVin: vin.toUpperCase(),
                    vehicleModel: ownerInfo.modelName,
                    appointmentDate: appointmentDateTime.toLocaleDateString('vi-VN'),
                    appointmentTime: `${timeSlot.startTime} - ${timeSlot.endTime}`,
                    serviceCenterName: appointment.serviceCenterName,
                    serviceCenterPhone: '1900-xxxx',
                    customerNotes: customerNotes || '',
                    systemUrl: process.env.SYSTEM_URL || 'http://localhost:3000'
                };

                console.log('📧 Email data being sent:', JSON.stringify(emailData, null, 2));



                const emailResult = await EmailService.sendAppointmentConfirmation(ownerInfo.ownerEmail, emailData);

                if (emailResult.success) {
                    console.log(`✅ Đã gửi email xác nhận lịch hẹn cho ${ownerInfo.ownerEmail}`);
                }
            } catch (emailError) {
                console.error('❌ Lỗi gửi email xác nhận lịch hẹn:', emailError.message);
                // Continue without failing the appointment creation
            }
        }

        return responseHelper.success(res, {
            appointmentId: appointment._id,
            campaignCode: campaign.campaignCode,
            vin: appointment.vin,
            customerName: appointment.customerName,
            appointmentDate: appointment.appointmentDate,
            timeSlot: appointment.timeSlot,
            status: appointment.status,
            serviceCenterName: appointment.serviceCenterName,
            assignedTechnician: appointment.assignedTechnician,
            createdAt: appointment.createdAt
        }, "Tạo lịch hẹn thành công", 201);

    } catch (error) {
        return handleControllerError(res, 'createAppointment', error, "Lỗi server khi tạo lịch hẹn", 500, {
            campaignId: req.body.campaignId,
            vin: req.body.vin
        });
    }
};

/**
 * UC15.2: Lấy danh sách lịch hẹn theo service center
 * GET /appointments
 * Role: service_staff, admin
 */
const getAppointmentsByServiceCenter = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            date,
            campaignId,
            search
        } = req.query;

        const serviceCenterId = req.user.serviceCenterId || req.user.sub;
        const Appointment = AppointmentModel();

        // Build query
        const query = { serviceCenterId };

        if (status) {
            query.status = status;
        }

        if (campaignId) {
            query.campaignId = campaignId;
        }

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            query.appointmentDate = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }

        if (search) {
            query.$or = [
                { vin: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } },
                { customerPhone: { $regex: search, $options: 'i' } },
                { campaignCode: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [appointments, total] = await Promise.all([
            Appointment.find(query)
                .select('campaignCode campaignName vin vehicleModel customerName customerPhone customerEmail appointmentDate timeSlot status assignedTechnician createdAt')
                .sort({ appointmentDate: 1, 'timeSlot.startTime': 1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Appointment.countDocuments(query)
        ]);

        const pagination = responseHelper.createPagination(page, limit, total);

        return responseHelper.success(res, {
            appointments,
            pagination,
            summary: {
                total,
                scheduled: await Appointment.countDocuments({ ...query, status: 'scheduled' }),
                confirmed: await Appointment.countDocuments({ ...query, status: 'confirmed' }),
                completed: await Appointment.countDocuments({ ...query, status: 'completed' }),
                cancelled: await Appointment.countDocuments({ ...query, status: 'cancelled' })
            }
        }, "Lấy danh sách lịch hẹn thành công");

    } catch (error) {
        return handleControllerError(res, 'getAppointmentsByServiceCenter', error, "Lỗi server khi lấy danh sách lịch hẹn", 500);
    }
};

/**
 * UC15.3: Lấy lịch hẹn theo ngày (calendar view)
 * GET /appointments/calendar/:date
 * Role: service_staff, admin
 */
const getAppointmentsByDate = async (req, res) => {
    try {
        const { date } = req.params;
        const serviceCenterId = req.user.serviceCenterId || req.user.sub;

        if (!date) {
            return responseHelper.error(res, "Ngày là bắt buộc", 400);
        }

        const Appointment = AppointmentModel();
        const appointments = await Appointment.findByServiceCenter(serviceCenterId, { date });

        // Group by time slots
        const timeSlots = {};
        appointments.forEach(appointment => {
            const timeKey = `${appointment.timeSlot.startTime}-${appointment.timeSlot.endTime}`;
            if (!timeSlots[timeKey]) {
                timeSlots[timeKey] = [];
            }
            timeSlots[timeKey].push(appointment);
        });

        return responseHelper.success(res, {
            date,
            appointments,
            timeSlots,
            summary: {
                total: appointments.length,
                byStatus: {
                    scheduled: appointments.filter(a => a.status === 'scheduled').length,
                    confirmed: appointments.filter(a => a.status === 'confirmed').length,
                    in_progress: appointments.filter(a => a.status === 'in_progress').length,
                    completed: appointments.filter(a => a.status === 'completed').length,
                    cancelled: appointments.filter(a => a.status === 'cancelled').length
                }
            }
        }, "Lấy lịch hẹn theo ngày thành công");

    } catch (error) {
        return handleControllerError(res, 'getAppointmentsByDate', error, "Lỗi server khi lấy lịch hẹn theo ngày", 500, {
            date: req.params.date
        });
    }
};

/**
 * UC15.4: Cập nhật trạng thái lịch hẹn
 * PUT /appointments/:appointmentId/status
 * Role: service_staff, admin
 */
const updateAppointmentStatus = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { status, notes, completionNotes } = req.body;

        if (!status) {
            return responseHelper.error(res, "Trạng thái là bắt buộc", 400);
        }

        const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'];
        if (!validStatuses.includes(status)) {
            return responseHelper.error(res, "Trạng thái không hợp lệ", 400);
        }

        const Appointment = AppointmentModel();
        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) {
            return responseHelper.error(res, "Không tìm thấy lịch hẹn", 404);
        }

        // Check service center permission
        const userServiceCenterId = req.user.serviceCenterId || req.user.sub;
        if (appointment.serviceCenterId.toString() !== userServiceCenterId.toString()) {
            return responseHelper.error(res, "Không có quyền cập nhật lịch hẹn này", 403);
        }

        // Update appointment status
        const oldStatus = appointment.status;
        appointment.status = status;
        appointment.updatedBy = req.user.email;

        if (notes) {
            appointment.internalNotes = notes;
        }

        // Set timestamps based on status
        if (status === 'confirmed' && oldStatus !== 'confirmed') {
            appointment.markAsConfirmed(req.user.email);
        } else if (status === 'completed' && oldStatus !== 'completed') {
            appointment.markAsCompleted(req.user.email);
            if (completionNotes) {
                appointment.internalNotes = completionNotes;
            }
        } else if (status === 'cancelled') {
            appointment.cancel(req.user.email, notes || 'Hủy bởi trung tâm dịch vụ');
        }

        await appointment.save();

        // Update vehicle status in campaign
        const RecallCampaign = RecallCampaignModel();
        const campaign = await RecallCampaign.findById(appointment.campaignId);

        if (campaign) {
            const vehicle = campaign.affectedVehicles.find(v => v.vin === appointment.vin);
            if (vehicle) {
                if (status === 'completed') {
                    vehicle.status = 'completed';
                    vehicle.completedAt = new Date();
                } else if (status === 'cancelled') {
                    vehicle.status = 'notified';
                    vehicle.scheduledDate = null;
                } else if (status === 'in_progress') {
                    vehicle.status = 'in_progress';
                }

                campaign.updatedBy = req.user.email;
                await campaign.save();
            }
        }

        return responseHelper.success(res, {
            appointmentId: appointment._id,
            vin: appointment.vin,
            oldStatus,
            newStatus: appointment.status,
            updatedAt: appointment.updatedAt,
            confirmedAt: appointment.confirmedAt,
            completedAt: appointment.completedAt,
            cancelledAt: appointment.cancelledAt
        }, "Cập nhật trạng thái lịch hẹn thành công");

    } catch (error) {
        return handleControllerError(res, 'updateAppointmentStatus', error, "Lỗi server khi cập nhật trạng thái lịch hẹn", 500, {
            appointmentId: req.params.appointmentId
        });
    }
};

/**
 * UC15.5: Hủy lịch hẹn
 * DELETE /appointments/:appointmentId
 * Role: service_staff, admin
 */
const cancelAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { reason } = req.body || {};

        const Appointment = AppointmentModel();
        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) {
            return responseHelper.error(res, "Không tìm thấy lịch hẹn", 404);
        }

        console.log('🔍 Debug cancel appointment:', {
            appointmentId,
            customerEmail: appointment.customerEmail,
            serviceCenterId: appointment.serviceCenterId,
            userServiceCenterId: req.user.serviceCenterId || req.user.sub,
            userRole: req.user.role
        });

        // Check service center permission (skip for admin)
        if (req.user.role !== 'admin') {
            const userServiceCenterId = req.user.serviceCenterId || req.user.sub;
            if (appointment.serviceCenterId.toString() !== userServiceCenterId.toString()) {
                return responseHelper.error(res, "Không có quyền hủy lịch hẹn này", 403);
            }
        }

        if (!appointment.canBeCancelled()) {
            return responseHelper.error(res, "Không thể hủy lịch hẹn này", 400);
        }

        // Cancel appointment
        appointment.cancel(req.user.email, reason || 'Hủy bởi trung tâm dịch vụ');
        await appointment.save();

        // Update vehicle status in campaign
        const RecallCampaign = RecallCampaignModel();
        const campaign = await RecallCampaign.findById(appointment.campaignId);

        if (campaign) {
            const vehicle = campaign.affectedVehicles.find(v => v.vin === appointment.vin);
            if (vehicle) {
                vehicle.status = 'notified';
                vehicle.scheduledDate = null;
                vehicle.notes = `Lịch hẹn đã bị hủy: ${reason || 'Không có lý do'}`;

                campaign.updatedBy = req.user.email;
                await campaign.save();
            }
        }

        // Send cancellation email if customer has email
        if (appointment.customerEmail && appointment.customerEmail !== 'Không có') {
            try {
                await EmailService.initialize();

                const emailData = {
                    customerName: appointment.customerName,
                    appointmentId: appointment._id,
                    campaignName: appointment.campaignName,
                    vehicleVin: appointment.vin,
                    vehicleModel: appointment.vehicleModel,
                    appointmentDate: appointment.appointmentDate.toLocaleDateString('vi-VN'),
                    appointmentTime: `${appointment.timeSlot.startTime} - ${appointment.timeSlot.endTime}`,
                    serviceCenterName: appointment.serviceCenterName,
                    serviceCenterPhone: '1900-xxxx',
                    cancellationReason: reason || 'Không có lý do cụ thể',
                    systemUrl: process.env.SYSTEM_URL || 'http://localhost:3000'
                };

                const emailResult = await EmailService.sendAppointmentCancellation(appointment.customerEmail, emailData);

                if (emailResult.success) {
                    console.log(`✅ Đã gửi email hủy lịch hẹn cho ${appointment.customerEmail}`);
                }
            } catch (emailError) {
                console.error('❌ Lỗi gửi email hủy lịch hẹn:', emailError.message);
            }
        }

        return responseHelper.success(res, {
            appointmentId: appointment._id,
            vin: appointment.vin,
            status: appointment.status,
            cancelledAt: appointment.cancelledAt,
            cancellationReason: appointment.cancellationReason
        }, "Hủy lịch hẹn thành công");

    } catch (error) {
        return handleControllerError(res, 'cancelAppointment', error, "Lỗi server khi hủy lịch hẹn", 500, {
            appointmentId: req.params.appointmentId
        });
    }
};

module.exports = {
    createAppointment,
    getAppointmentsByServiceCenter,
    getAppointmentsByDate,
    updateAppointmentStatus,
    cancelAppointment
};
