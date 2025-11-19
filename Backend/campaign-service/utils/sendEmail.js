import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, html }) => {
  try {
    // Tạo transporter SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // ví dụ: smtp.gmail.com
      port: process.env.SMTP_PORT || 587,
      secure: false, // true nếu dùng 465
      auth: {
        user: process.env.SMTP_USER, // email gửi
        pass: process.env.SMTP_PASS, // password / app password
      },
    });

    const info = await transporter.sendMail({
      from: `"Your Company" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Send email error:", error);
    throw error;
  }
};

export default sendEmail;
