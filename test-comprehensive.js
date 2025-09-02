// Comprehensive OTP test to mimic frontend behavior
const testFrontendFlow = async () => {
    try {
        console.log('🌐 Testing Frontend-like OTP flow...');
        
        const mobile = '9701533362';
        
        // Step 1: Send OTP
        console.log('📱 Step 1: Sending OTP...');
        const sendResponse = await fetch('http://localhost:3000/api/auth/send-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ mobile })
        });
        
        const sendResult = await sendResponse.json();
        console.log('📤 Send Response:', {
            success: sendResult.success,
            message: sendResult.message,
            hasOTP: !!sendResult.data?.otp
        });
        
        if (!sendResult.success) {
            console.error('❌ Failed to send OTP');
            return;
        }
        
        // Get OTP from development response
        const otp = sendResult.data?.otp;
        if (!otp) {
            console.error('❌ No OTP in response (production mode?)');
            return;
        }
        
        console.log(`🔑 Received OTP: ${otp}`);
        
        // Step 2: Wait a moment (simulate user input time)
        console.log('⏱️  Waiting 2 seconds to simulate user input...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 3: Verify OTP
        console.log('✅ Step 2: Verifying OTP...');
        const verifyResponse = await fetch('http://localhost:3000/api/auth/verify-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ mobile, otp })
        });
        
        const verifyResult = await verifyResponse.json();
        console.log('🎯 Verify Response:', {
            success: verifyResult.success,
            message: verifyResult.message,
            hasToken: !!verifyResult.data?.token,
            hasUser: !!verifyResult.data?.user
        });
        
        if (verifyResult.success) {
            console.log('🎉 OTP flow completed successfully!');
            console.log('👤 User:', verifyResult.data.user.name);
            console.log('🎯 Redirect to:', verifyResult.data.defaultActions?.redirectTo);
        } else {
            console.error('❌ OTP verification failed:', verifyResult.message);
        }
        
    } catch (error) {
        console.error('💥 Network error:', error.message);
    }
};

// Test multiple scenarios
const runTests = async () => {
    console.log('🚀 Starting comprehensive OTP tests...\n');
    
    // Test 1: Normal flow
    await testFrontendFlow();
    
    console.log('\n⏳ Waiting 3 seconds before next test...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Test with wrong OTP
    console.log('🧪 Testing with wrong OTP...');
    try {
        const response = await fetch('http://localhost:3000/api/auth/verify-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ mobile: '9701533362', otp: '123456' })
        });
        
        const result = await response.json();
        console.log('🔍 Wrong OTP Response:', {
            success: result.success,
            message: result.message
        });
    } catch (error) {
        console.error('💥 Error testing wrong OTP:', error.message);
    }
};

runTests();
