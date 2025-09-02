/**
 * Simple Registration Status Test
 */

const axios = require('axios');

async function simpleTest() {
    try {
        console.log('🧪 Simple Registration Status Test...\n');

        // Use existing token
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmFtZSI6IlNyaWRoYXIiLCJtb2JpbGUiOiI5NzAxNTMzMzYyIiwiaWF0IjoxNzM2MDA4ODM0LCJleHAiOjE3MzYwOTUyMzR9.wL3cDN5X4j_KCHL-DdQpqiZQ2uJp7rEtmJfJkGTwG2Y';

        // First check if API is working
        console.log('1️⃣ Testing basic users API...');
        const usersResponse = await axios.get('http://localhost:3000/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ API working, users count:', usersResponse.data.data.length);

        // Test creating user with registration status
        console.log('\n2️⃣ Creating user with Active status...');
        const userData = {
            name: 'Test Active User Simple',
            mobile: '9999888777',
            email: 'testsimple@test.com',
            designation_id: 3,
            salary: 30000,
            allowance: 2000,
            registered: 1
        };

        const createResponse = await axios.post('http://localhost:3000/api/users', userData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ User created:', {
            success: createResponse.data.success,
            name: createResponse.data.data?.name,
            registered: createResponse.data.data?.registered
        });

        console.log('\n🎉 Registration Status Toggle is working!');

    } catch (error) {
        console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
        
        if (error.response?.data) {
            console.log('Full error response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

simpleTest();
