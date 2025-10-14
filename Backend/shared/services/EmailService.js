const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

/**
 * 📧 Email Service - Dịch vụ gửi email cho hệ thống bảo hành
 * Hỗ trợ gửi email thông báo cho khách hàng và service center
 */
class EmailService {
    constructor() {
        this.transporter = null;
        this.isInitialized = false;
        this.templates = new Map();
    }

    /**
     * Khởi tạo email service với cấu hình SMTP
     */
    async initialize() {
        try {
            if (this.isInitialized) {
                return;
            }

            // Kiểm tra cấu hình email
            if (!process.env.EMAIL_PASSWORD) {
                console.warn('⚠️ EMAIL_PASSWORD không được cấu hình. Email service sẽ không hoạt động.');
                return;
            }

            // Tạo transporter với cấu hình Gmail
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                },
                pool: true, // Sử dụng connection pool
                maxConnections: 5,
                maxMessages: 100,
                textEncoding: 'base64',
                disableFileAccess: true,
                disableUrlAccess: true
            });

            // Verify connection
            await this.verifyConnection();

            // Load email templates
            await this.loadTemplates();

            this.isInitialized = true;
            console.log('✅ Email Service đã khởi tạo thành công');

        } catch (error) {
            console.error('❌ Lỗi khởi tạo Email Service:', error.message);
            throw error;
        }
    }

    /**
     * Kiểm tra kết nối SMTP
     */
    async verifyConnection() {
        if (!this.transporter) {
            throw new Error('Email transporter chưa được khởi tạo');
        }

        try {
            await this.transporter.verify();
            console.log('✅ Kết nối SMTP thành công');
        } catch (error) {
            console.error('❌ Lỗi kết nối SMTP:', error.message);
            throw new Error(`Không thể kết nối SMTP: ${error.message}`);
        }
    }

    /**
     * Load email templates từ thư mục templates
     */
    async loadTemplates() {
        try {
            const templatesDir = path.join(__dirname, '../templates/email');

            // Tạo thư mục templates nếu chưa có
            try {
                await fs.access(templatesDir);
            } catch {
                await fs.mkdir(templatesDir, { recursive: true });
                console.log('📁 Đã tạo thư mục templates/email');
            }

            // Load các template có sẵn
            const templateFiles = [
                'recall-notification.hbs',
                'warranty-claim-status.hbs',
                'vehicle-registration.hbs',
                'appointment-confirmation.hbs',
                'appointment-cancellation.hbs'
            ];

            for (const templateFile of templateFiles) {
                try {
                    const templatePath = path.join(templatesDir, templateFile);
                    const templateContent = await fs.readFile(templatePath, 'utf8');
                    const templateName = path.basename(templateFile, '.hbs');
                    this.templates.set(templateName, handlebars.compile(templateContent));
                    console.log(`📧 Đã load template: ${templateName}`);
                } catch (error) {
                    console.error(`❌ Failed to load template ${templateFile}:`, error.message);
                    // Load default template instead of silently failing
                    const templateName = path.basename(templateFile, '.hbs');
                    const defaultTemplate = this.getDefaultTemplate(templateName);
                    if (defaultTemplate) {
                        this.templates.set(templateName, defaultTemplate);
                        console.log(`📧 Loaded default template for: ${templateName}`);
                    } else {
                        console.error(`❌ No default template available for: ${templateName}`);
                    }
                }
            }

            console.log(`✅ Templates loaded successfully: ${this.templates.size} templates`);
            console.log(`📋 Available templates: ${Array.from(this.templates.keys()).join(', ')}`);

        } catch (error) {
            console.error('❌ Lỗi load templates:', error.message);
        }
    }

    /**
     * Gửi email với template
     */
    async sendEmail(options) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            if (!this.transporter) {
                throw new Error('Email service chưa được khởi tạo hoặc cấu hình không đúng');
            }

            const {
                to,
                cc,
                bcc,
                subject,
                template,
                templateData = {},
                priority = 'normal'
            } = options;

            // Validate required fields
            if (!to || !subject) {
                throw new Error('Email "to" và "subject" là bắt buộc');
            }

            // Render template
            let htmlContent = '';
            let textContent = '';

            // Ưu tiên HTML có sẵn hơn template
            if (options.html || options.text) {
                htmlContent = options.html || '';
                textContent = options.text || '';
            } else if (template) {
                const renderResult = await this.renderTemplate(template, templateData);
                htmlContent = renderResult.html;
                textContent = renderResult.text;
            } else {
                htmlContent = templateData.html || '';
                textContent = templateData.text || '';
            }

            // Cấu hình email
            const mailOptions = {
                from: {
                    name: process.env.EMAIL_FROM_NAME || 'Hệ Thống Bảo Hành OEM EV',
                    address: process.env.EMAIL_USER
                },
                to: Array.isArray(to) ? to.join(', ') : to,
                subject: subject,
                html: htmlContent,
                text: textContent,
                priority: priority === 'high' ? 'high' : 'normal',
                encoding: 'utf8'
            };

            if (cc) {
                mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
            }

            if (bcc) {
                mailOptions.bcc = Array.isArray(bcc) ? bcc.join(', ') : bcc;
            }

            // Gửi email
            const result = await this.transporter.sendMail(mailOptions);

            console.log(`✅ Email đã gửi thành công đến ${to}:`, {
                messageId: result.messageId,
                subject: subject,
                template: template || 'custom'
            });

            return {
                success: true,
                messageId: result.messageId,
                to: to,
                subject: subject
            };

        } catch (error) {
            console.error('❌ Lỗi gửi email:', {
                error: error.message,
                to: options.to,
                subject: options.subject,
                template: options.template
            });

            return {
                success: false,
                error: error.message,
                to: options.to,
                subject: options.subject
            };
        }
    }

    /**
     * Render template với data
     */
    async renderTemplate(templateName, data) {
        try {
            // Kiểm tra template đã load
            console.log(`🔍 Looking for template: ${templateName}`);
            console.log(`📋 Available templates:`, Array.from(this.templates.keys()));
            let template = this.templates.get(templateName);
            if (!template) {
                console.error(`❌ Template ${templateName} not found!`);
                console.error(`📋 Available templates:`, Array.from(this.templates.keys()));
                throw new Error(`Template ${templateName} not found`);
            } else {
                console.log(`✅ Found template: ${templateName}`);
            }

            console.log(`🎨 Rendering template ${templateName} with data:`, JSON.stringify(data, null, 2));
            const html = template(data);
            console.log(`📄 Generated HTML length: ${html.length} characters`);
            console.log(`📄 Generated HTML preview (first 500 chars):`, html.substring(0, 500));

            // Log phần body để kiểm tra data
            const bodyStart = html.indexOf('<body>');
            const bodyEnd = html.indexOf('</body>');
            if (bodyStart !== -1 && bodyEnd !== -1) {
                const bodyContent = html.substring(bodyStart, bodyEnd + 7);
                console.log(`📄 HTML Body content (first 1000 chars):`, bodyContent.substring(0, 1000));
            }
            const text = this.htmlToText(html);

            return { html, text };

        } catch (error) {
            console.error(`❌ Lỗi render template ${templateName}:`, error.message);
            console.error(`❌ Template error stack:`, error.stack);
            throw error; // Không dùng fallback, throw error để debug
        }
    }

    /**
     * Lấy default template cho từng loại email
     */
    getDefaultTemplate(templateName) {
        const defaultTemplates = {
            'recall-notification': handlebars.compile(`
                <h2>🚨 Thông Báo Chiến Dịch Recall</h2>
                <p>Kính gửi {{serviceCenterName}},</p>
                <p>Chúng tôi thông báo về chiến dịch recall mới: <strong>{{campaignName}}</strong></p>
                <p>Mã chiến dịch: {{campaignCode}}</p>
                <p>Số xe bị ảnh hưởng: {{affectedVehiclesCount}}</p>
                <p>Vui lòng đăng nhập hệ thống để xem chi tiết và thực hiện các bước cần thiết.</p>
            `),
            'warranty-claim-status': handlebars.compile(`
                <h2>📋 Cập Nhật Trạng Thái Yêu Cầu Bảo Hành</h2>
                <p>Kính gửi {{customerName}},</p>
                <p>Yêu cầu bảo hành của bạn đã được cập nhật:</p>
                <p>Mã yêu cầu: <strong>{{claimNumber}}</strong></p>
                <p>VIN: {{vin}}</p>
                <p>Trạng thái mới: <strong>{{statusText}}</strong></p>
                <p>{{nextStepsText}}</p>
            `),
            'vehicle-registration': handlebars.compile(`
                <h2>🚗 Xác Nhận Đăng Ký Xe</h2>
                <p>Kính gửi {{customerName}},</p>
                <p>Xe của bạn đã được đăng ký thành công trong hệ thống bảo hành:</p>
                <p>VIN: <strong>{{vin}}</strong></p>
                <p>Model: {{modelName}}</p>
                <p>Ngày đăng ký: {{registrationDate}}</p>
                <p>Cảm ơn bạn đã tin tưởng sản phẩm của chúng tôi!</p>
            `),
            'appointment-confirmation': handlebars.compile(`
                <h2>📅 Xác Nhận Lịch Hẹn Recall</h2>
                <p>Kính chào <strong>{{customerName}}</strong>,</p>
                <p>Chúng tôi xác nhận đã nhận được yêu cầu đặt lịch hẹn của bạn cho chiến dịch recall.</p>
                <h3>📋 Thông Tin Lịch Hẹn</h3>
                <p>🆔 Mã lịch hẹn: {{appointmentId}}</p>
                <p>🚗 Xe: {{vehicleModel}} - {{vehicleVin}}</p>
                <p>📅 Ngày hẹn: {{appointmentDate}}</p>
                <p>⏰ Giờ hẹn: {{appointmentTime}}</p>
                <p>🏢 Chiến dịch: {{campaignName}}</p>
                <h3>🏪 Thông Tin Trung Tâm Dịch Vụ</h3>
                <p><strong>{{serviceCenterName}}</strong></p>
                <p>📞 Hotline: {{serviceCenterPhone}}</p>
                {{#if customerNotes}}
                <h4>📝 Ghi Chú Của Bạn:</h4>
                <p>{{customerNotes}}</p>
                {{/if}}
                <h4>⚠️ Lưu Ý Quan Trọng:</h4>
                <ul>
                    <li>Vui lòng đến đúng giờ hẹn để đảm bảo lịch trình</li>
                    <li>Mang theo giấy tờ xe và CMND/CCCD</li>
                    <li>Nếu cần thay đổi lịch hẹn, vui lòng liên hệ trước ít nhất 24 giờ</li>
                    <li>Thời gian thực hiện dự kiến: 1-2 giờ</li>
                </ul>
                <p>Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi!</p>
            `),
            'appointment-cancellation': handlebars.compile(`
                <h2>❌ Thông Báo Hủy Lịch Hẹn</h2>
                <p>Kính chào <strong>{{customerName}}</strong>,</p>
                <p>Chúng tôi thông báo lịch hẹn của bạn đã được hủy.</p>
                <h3>📋 Thông Tin Lịch Hẹn Đã Hủy</h3>
                <p>🆔 Mã lịch hẹn: {{appointmentId}}</p>
                <p>🚗 Xe: {{vehicleModel}} - {{vehicleVin}}</p>
                <p>📅 Ngày hẹn: {{appointmentDate}}</p>
                <p>⏰ Giờ hẹn: {{appointmentTime}}</p>
                <p>🏢 Chiến dịch: {{campaignName}}</p>
                {{#if cancellationReason}}
                <h4>📝 Lý Do Hủy:</h4>
                <p>{{cancellationReason}}</p>
                {{/if}}
                <p>Nếu bạn muốn đặt lại lịch hẹn, vui lòng liên hệ với trung tâm dịch vụ.</p>
                <p>📞 Hotline: {{serviceCenterPhone}}</p>
            `)
        };

        return defaultTemplates[templateName] || handlebars.compile('<p>{{message}}</p>');
    }

    /**
     * Get default template for a given template name
     * FIXED: Added missing method referenced in template loading
     */
    getDefaultTemplate(templateName) {
        const defaultTemplates = {
            'appointment-confirmation': `
                <h2>📅 Xác Nhận Lịch Hẹn Recall</h2>
                <p>Kính chào {{customerName}},</p>
                <p>Lịch hẹn recall của bạn đã được xác nhận:</p>
                <ul>
                    <li><strong>Mã chiến dịch:</strong> {{campaignCode}}</li>
                    <li><strong>Xe:</strong> {{vehicleModel}} - {{vin}}</li>
                    <li><strong>Ngày:</strong> {{appointmentDate}}</li>
                    <li><strong>Thời gian:</strong> {{timeSlot.startTime}} - {{timeSlot.endTime}}</li>
                </ul>
                <p>Vui lòng đến đúng giờ. Cảm ơn!</p>
            `,
            'appointment-cancellation': `
                <h2>❌ Hủy Lịch Hẹn Recall</h2>
                <p>Kính chào {{customerName}},</p>
                <p>Lịch hẹn recall của bạn đã bị hủy:</p>
                <ul>
                    <li><strong>Mã chiến dịch:</strong> {{campaignCode}}</li>
                    <li><strong>Xe:</strong> {{vehicleModel}} - {{vin}}</li>
                    <li><strong>Lý do:</strong> {{reason}}</li>
                </ul>
                <p>Vui lòng liên hệ để đặt lịch mới. Cảm ơn!</p>
            `,
            'recall-notification': `
                <h2>🚨 Thông Báo Recall</h2>
                <p>Kính chào {{customerName}},</p>
                <p>Xe của bạn thuộc diện recall:</p>
                <ul>
                    <li><strong>Mã chiến dịch:</strong> {{campaignCode}}</li>
                    <li><strong>Xe:</strong> {{vehicleModel}} - {{vin}}</li>
                    <li><strong>Mô tả:</strong> {{description}}</li>
                </ul>
                <p>Vui lòng liên hệ để đặt lịch sửa chữa. Cảm ơn!</p>
            `
        };

        return defaultTemplates[templateName] || null;
    }

    /**
     * Fallback template khi có lỗi
     */
    getFallbackTemplate(templateName, data) {
        return `
            <h2>Thông Báo Từ Hệ Thống Bảo Hành</h2>
            <p>${data.message}</p>
            <p>Vui lòng đăng nhập hệ thống để xem chi tiết.</p>
        `;
    }

    /**
     * Chuyển HTML thành text đơn giản
     */
    htmlToText(html) {
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
    }

    /**
     * Gửi email thông báo recall campaign
     */
    async sendRecallNotification(serviceCenterEmail, campaignData) {
        return await this.sendEmail({
            to: serviceCenterEmail,
            subject: `🚨 Thông Báo Chiến Dịch Recall: ${campaignData.campaignName}`,
            template: 'recall-notification',
            templateData: campaignData,
            priority: 'high'
        });
    }

    /**
     * Gửi email cập nhật trạng thái warranty claim
     */
    async sendWarrantyClaimStatusUpdate(customerEmail, claimData) {
        return await this.sendEmail({
            to: customerEmail,
            subject: `📋 Cập Nhật Yêu Cầu Bảo Hành: ${claimData.claimNumber}`,
            template: 'warranty-claim-status',
            templateData: claimData,
            priority: 'normal'
        });
    }

    /**
     * Gửi email xác nhận đăng ký xe
     */
    async sendVehicleRegistrationConfirmation(customerEmail, vehicleData) {
        return await this.sendEmail({
            to: customerEmail,
            subject: `🚗 Xác Nhận Đăng Ký Xe: ${vehicleData.vin}`,
            template: 'vehicle-registration',
            templateData: vehicleData,
            priority: 'normal'
        });
    }

    /**
     * UC15: Gửi email xác nhận lịch hẹn
     */
    async sendAppointmentConfirmation(to, data) {
        try {
            console.log('📧 sendAppointmentConfirmation called with data:', JSON.stringify(data, null, 2));
            const { html, text } = await this.renderTemplate('appointment-confirmation', data);

            const mailOptions = {
                to,
                subject: `📅 Xác Nhận Lịch Hẹn Recall - ${data.campaignName}`,
                html,
                text,
                template: 'appointment-confirmation'
            };

            return await this.sendEmail(mailOptions);

        } catch (error) {
            console.error('❌ Lỗi gửi email xác nhận lịch hẹn:', error.message);
            return {
                success: false,
                error: error.message,
                to,
                subject: `📅 Xác Nhận Lịch Hẹn Recall - ${data.campaignName}`
            };
        }
    }

    /**
     * UC15: Gửi email hủy lịch hẹn
     */
    async sendAppointmentCancellation(to, data) {
        try {
            const { html, text } = await this.renderTemplate('appointment-cancellation', data);

            const mailOptions = {
                to,
                subject: `❌ Thông Báo Hủy Lịch Hẹn - ${data.campaignName}`,
                html,
                text,
                template: 'appointment-cancellation'
            };

            return await this.sendEmail(mailOptions);

        } catch (error) {
            console.error('❌ Lỗi gửi email hủy lịch hẹn:', error.message);
            return {
                success: false,
                error: error.message,
                to,
                subject: `❌ Thông Báo Hủy Lịch Hẹn - ${data.campaignName}`
            };
        }
    }

    /**
     * UC15: Gửi email nhắc nhở lịch hẹn (1 ngày trước)
     */
    async sendAppointmentReminder(to, data) {
        try {
            const { html, text } = await this.renderTemplate('appointment-reminder', data);

            const mailOptions = {
                to,
                subject: `⏰ Nhắc Nhở Lịch Hẹn Recall - ${data.campaignName}`,
                html,
                text
            };

            return await this.sendEmail(mailOptions);

        } catch (error) {
            console.error('❌ Lỗi gửi email nhắc nhở lịch hẹn:', error.message);
            return {
                success: false,
                error: error.message,
                to,
                subject: `⏰ Nhắc Nhở Lịch Hẹn Recall - ${data.campaignName}`
            };
        }
    }
}

// Export singleton instance
module.exports = new EmailService();
