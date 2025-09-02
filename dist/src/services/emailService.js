const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    async sendOTP(email, otp, mobile) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Your OTP for Login - Enercon',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center;">
                            <h2 style="color: #333; margin-bottom: 20px;">OTP Verification</h2>
                            <p style="font-size: 16px; color: #666; margin-bottom: 20px;">
                                Your One-Time Password (OTP) for mobile number <strong>${mobile}</strong> is:
                            </p>
                            <div style="background-color: #007bff; color: white; padding: 15px 30px; border-radius: 5px; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
                                ${otp}
                            </div>
                            <p style="font-size: 14px; color: #999; margin-top: 20px;">
                                This OTP is valid for 5 minutes only.<br>
                                Please do not share this OTP with anyone.
                            </p>
                        </div>
                        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
                            <p>If you didn't request this OTP, please ignore this email.</p>
                        </div>
                    </div>
                `
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`📧 OTP email sent to ${email} for mobile ${mobile}`);
            return result;
        } catch (error) {
            console.error('Error sending OTP email:', error);
            throw error;
        }
    }

    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Email service connected successfully');
            return true;
        } catch (error) {
            console.error('❌ Email service connection failed:', error);
            return false;
        }
    }
}

module.exports = new EmailService();
