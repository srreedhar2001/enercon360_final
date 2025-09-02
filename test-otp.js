// Test OTP flow
const testOTPFlow = async () => {
    try {
        console.log('🧪 Testing OTP flow...');
        
        // Step 1: Send OTP
        console.log('📱 Sending OTP...');
        const sendResponse = await fetch('http://localhost:3000/api/auth/send-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mobile: '9701533362' })
        });
        
        const sendResult = await sendResponse.json();
        console.log('📤 Send OTP Response:', sendResult);
        
        if (sendResult.success && sendResult.data.otp) {
            const otp = sendResult.data.otp;
            console.log(`🔑 Using OTP from response: ${otp}`);
            
            // Step 2: Verify OTP immediately
            console.log('✅ Verifying OTP...');
            const verifyResponse = await fetch('http://localhost:3000/api/auth/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    mobile: '9701533362',
                    otp: otp
                })
            });
            
            const verifyResult = await verifyResponse.json();
            console.log('🎯 Verify OTP Response:', verifyResult);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
};

testOTPFlow();
