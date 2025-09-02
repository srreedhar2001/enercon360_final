/**
 * Debug script to test OTP verification without frontend interference
 */

const axios = require('axios');

async function debugOTPVerification() {
    try {
        console.log('🐛 Debug: Testing OTP verification flow...\n');

        // Step 1: Request fresh OTP
        console.log('1️⃣ Requesting new OTP...');
        const otpResponse = await axios.post('http://localhost:3000/api/auth/send-otp', {
            mobile: '9701533362'
        });

        console.log('✅ OTP Response:', {
            success: otpResponse.data.success,
            message: otpResponse.data.message,
            otp: otpResponse.data.data?.otp || 'Not provided'
        });

        if (!otpResponse.data.data?.otp) {
            console.log('❌ No OTP received in response');
            return;
        }

        const receivedOTP = otpResponse.data.data.otp;
        console.log(`\n🔑 Received OTP: ${receivedOTP}`);

        // Wait 2 seconds to simulate user input time
        console.log('\n⏳ Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: Verify the exact OTP we received
        console.log(`\n2️⃣ Verifying OTP: ${receivedOTP}`);
        const verifyResponse = await axios.post('http://localhost:3000/api/auth/verify-otp', {
            mobile: '9701533362',
            otp: receivedOTP
        });

        console.log('✅ Verification Response:', {
            success: verifyResponse.data.success,
            message: verifyResponse.data.message,
            tokenReceived: !!verifyResponse.data.data?.token
        });

        if (verifyResponse.data.success) {
            console.log('\n🎉 SUCCESS: OTP verification worked correctly!');
        } else {
            console.log('\n❌ FAILED: OTP verification failed');
        }

    } catch (error) {
        console.error('❌ Error in debug test:', error.response?.data || error.message);
    }
}

// Run the debug test
debugOTPVerification();
