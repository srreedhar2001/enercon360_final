// Test SMTP connection
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testConnection() {
    console.log('Testing SMTP connection with:');
    console.log(`Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
    console.log(`Port: ${process.env.SMTP_PORT || '587'}`);
    console.log(`Secure: ${process.env.SMTP_SECURE || 'false'}`);
    console.log(`User: ${process.env.EMAIL_USER}`);
    console.log('---');

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true' || false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
    });

    try {
        await transporter.verify();
        console.log('✅ SMTP connection successful!');
        
        // Try sending a test email
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to yourself
            subject: 'SMTP Test - Enercon',
            text: 'If you receive this, SMTP is working correctly!'
        });
        
        console.log('✅ Test email sent!', info.messageId);
    } catch (error) {
        console.error('❌ SMTP connection failed:', error);
        console.error('Error details:', {
            code: error.code,
            errno: error.errno,
            syscall: error.syscall,
            address: error.address,
            port: error.port
        });
    }
}

testConnection();
