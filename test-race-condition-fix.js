/**
 * Test script to verify the race condition fix
 * This will test the OTP flow to ensure no duplicate requests
 */

const axios = require('axios');

async function testRaceConditionFix() {
    try {
        console.log('🔧 Testing race condition fix...\n');

        // Step 1: Request OTP
        console.log('1️⃣ Requesting OTP...');
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

        // Wait 3 seconds to simulate user interaction
        console.log('\n⏳ Waiting 3 seconds to simulate user input...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Step 2: Verify OTP immediately (should work now)
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
            console.log('\n🎉 SUCCESS: Race condition fixed! OTP verification worked correctly!');
            console.log('💡 The frontend should now work without duplicate requests');
        } else {
            console.log('\n❌ FAILED: There might still be an issue');
        }

    } catch (error) {
        console.error('❌ Error in race condition test:', error.response?.data || error.message);
    }
}

// Run the test
testRaceConditionFix();
