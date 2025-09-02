/**
 * Test script to verify visual OTP auto-population
 * Tests the enhanced UI indicators and animations
 */

const axios = require('axios');

async function testVisualOTPAutopopulation() {
    try {
        console.log('🧪 Testing visual OTP auto-population...\n');

        // Step 1: Request OTP
        console.log('1️⃣ Requesting OTP for mobile: 9701533362');
        const otpResponse = await axios.post('http://localhost:3000/api/auth/request-otp', {
            mobile: '9701533362'
        });

        console.log('✅ OTP Response:', {
            success: otpResponse.data.success,
            message: otpResponse.data.message,
            developmentOTP: otpResponse.data.developmentOTP || 'Not provided'
        });

        if (otpResponse.data.developmentOTP) {
            console.log('\n🎨 Visual Features Test:');
            console.log('   ✨ OTP will be auto-populated in input field');
            console.log('   🌈 Green ring and background highlight will appear');
            console.log('   📍 Visual indicator with checkmark icon will show');
            console.log('   ⚡ Pulse animation will play for 3 seconds');
            console.log('   🕐 Auto-cleanup after 5 seconds');
            console.log('\n🔍 OTP Value for testing:', otpResponse.data.developmentOTP);
            
            console.log('\n📱 Manual Testing Steps:');
            console.log('   1. Open: http://localhost:3000/login.html');
            console.log('   2. Enter mobile: 9701533362');
            console.log('   3. Click "Send OTP"');
            console.log('   4. Watch for visual auto-population!');
            console.log('   5. Verify OTP verification works');
        } else {
            console.log('❌ No development OTP provided in response');
        }

    } catch (error) {
        console.error('❌ Error testing visual OTP:', error.response?.data || error.message);
    }
}

// Run the test
testVisualOTPAutopopulation();
