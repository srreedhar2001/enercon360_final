/**
 * Quick test for user creation after bug fix
 */

const axios = require('axios');

async function testUserCreation() {
    try {
        console.log('🔧 Testing user creation after bug fix...\n');

        // Get fresh authentication
        console.log('1️⃣ Getting authentication...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/send-otp', {
            mobile: '9701533362'
        });

        const otp = loginResponse.data.data.otp;
        console.log('OTP received:', otp);

        const verifyResponse = await axios.post('http://localhost:3000/api/auth/verify-otp', {
            mobile: '9701533362',
            otp: otp
        });

        const token = verifyResponse.data.data.token;
        console.log('✅ Authentication successful');

        // Test creating user with Active status
        console.log('\n2️⃣ Testing user creation with Active status...');
        const userData = {
            name: 'Bug Fix Test User',
            mobile: '9988776655',
            email: 'bugfix@test.com',
            designation_id: 3,
            salary: 30000,
            allowance: 2500,
            registered: 1
        };

        const createResponse = await axios.post('http://localhost:3000/api/users', userData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ User created successfully!');
        console.log('Response:', {
            success: createResponse.data.success,
            message: createResponse.data.message,
            userData: createResponse.data.data
        });

        // Test creating user with Inactive status
        console.log('\n3️⃣ Testing user creation with Inactive status...');
        const inactiveUserData = {
            name: 'Inactive Test User',
            mobile: '9887766554',
            email: 'inactive@test.com',
            designation_id: 3,
            salary: 28000,
            allowance: 2000,
            registered: 0
        };

        const createInactiveResponse = await axios.post('http://localhost:3000/api/users', inactiveUserData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Inactive user created successfully!');
        console.log('Response:', {
            success: createInactiveResponse.data.success,
            message: createInactiveResponse.data.message,
            userData: createInactiveResponse.data.data
        });

        console.log('\n🎉 BUG FIXED! User creation is working with registration status!');

    } catch (error) {
        console.error('❌ Error details:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Full error:', error.message);
    }
}

testUserCreation();
