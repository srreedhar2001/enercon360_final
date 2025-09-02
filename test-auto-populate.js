// Test auto-population feature
const testAutoPopulation = async () => {
    try {
        console.log('🧪 Testing OTP auto-population feature...');
        
        const mobile = '9701533362';
        
        // Step 1: Send OTP and check response structure
        console.log('📱 Sending OTP...');
        const sendResponse = await fetch('http://localhost:3000/api/auth/send-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ mobile })
        });
        
        const sendResult = await sendResponse.json();
        console.log('📤 Send Response Structure:', {
            success: sendResult.success,
            message: sendResult.message,
            hasData: !!sendResult.data,
            hasOTP: !!sendResult.data?.otp,
            otp: sendResult.data?.otp
        });
        
        if (sendResult.success && sendResult.data?.otp) {
            console.log('✅ OTP auto-population will work!');
            console.log('🔑 OTP that will be auto-populated:', sendResult.data.otp);
            
            // Simulate what the frontend will do
            console.log('💾 Simulating sessionStorage...');
            console.log('   - loginMobile stored:', mobile);
            console.log('   - developmentOTP stored:', sendResult.data.otp);
            
            // Test verification with the auto-populated OTP
            setTimeout(async () => {
                console.log('🎯 Testing verification with auto-populated OTP...');
                const verifyResponse = await fetch('http://localhost:3000/api/auth/verify-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        mobile: mobile,
                        otp: sendResult.data.otp 
                    })
                });
                
                const verifyResult = await verifyResponse.json();
                console.log('✅ Auto-populated OTP verification:', {
                    success: verifyResult.success,
                    message: verifyResult.message
                });
                
                if (verifyResult.success) {
                    console.log('🎉 Auto-population feature working perfectly!');
                } else {
                    console.error('❌ Auto-populated OTP failed verification');
                }
            }, 1000);
            
        } else {
            console.warn('⚠️  OTP not in response - may be production mode');
        }
        
    } catch (error) {
        console.error('💥 Test error:', error.message);
    }
};

testAutoPopulation();
