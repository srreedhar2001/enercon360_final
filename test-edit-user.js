/**
 * Test script to verify the Edit User functionality
 * This tests the API endpoints used by the edit functionality
 */

const axios = require('axios');

async function testEditUserFunctionality() {
    try {
        console.log('🧪 Testing Edit User functionality...\n');

        // First, get auth token by logging in
        console.log('1️⃣ Getting authentication token...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/send-otp', {
            mobile: '9701533362'
        });

        if (!loginResponse.data.success || !loginResponse.data.data?.otp) {
            console.log('❌ Failed to get OTP');
            return;
        }

        const otp = loginResponse.data.data.otp;
        const verifyResponse = await axios.post('http://localhost:3000/api/auth/verify-otp', {
            mobile: '9701533362',
            otp: otp
        });

        if (!verifyResponse.data.success) {
            console.log('❌ Failed to verify OTP');
            return;
        }

        const token = verifyResponse.data.data.token;
        console.log('✅ Authentication successful');

        // Step 2: Get all users to find one to edit
        console.log('\n2️⃣ Fetching users list...');
        const usersResponse = await axios.get('http://localhost:3000/api/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Users Response:', {
            success: usersResponse.data.success,
            userCount: usersResponse.data.data?.length || 0
        });

        if (!usersResponse.data.success || !usersResponse.data.data?.length) {
            console.log('❌ No users found to edit');
            return;
        }

        const userToEdit = usersResponse.data.data[0];
        console.log(`\n🎯 Found user to edit: ${userToEdit.name} (ID: ${userToEdit.id})`);

        // Step 3: Test GET single user (used by edit functionality)
        console.log('\n3️⃣ Testing single user fetch...');
        const singleUserResponse = await axios.get(`http://localhost:3000/api/users/${userToEdit.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Single User Response:', {
            success: singleUserResponse.data.success,
            userName: singleUserResponse.data.data?.name || 'N/A'
        });

        // Step 4: Test user update
        console.log('\n4️⃣ Testing user update...');
        const updateData = {
            name: userToEdit.name + ' (Updated)',
            mobile: userToEdit.phone,
            email: userToEdit.emailID,
            username: userToEdit.username,
            designation_id: userToEdit.designation_id,
            managerID: userToEdit.managerID,
            salary: userToEdit.salary,
            allowance: userToEdit.allowance
        };

        const updateResponse = await axios.put(`http://localhost:3000/api/users/${userToEdit.id}`, updateData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Update Response:', {
            success: updateResponse.data.success,
            message: updateResponse.data.message
        });

        if (updateResponse.data.success) {
            console.log('\n🎉 SUCCESS: Edit User functionality is working!');
            console.log('📝 The user.html page should now support:');
            console.log('   ✨ Opening edit modal when clicking Edit button');
            console.log('   📋 Pre-populating form with user data');
            console.log('   🔄 Updating user information');
            console.log('   💾 Saving changes to database');
            console.log('   🔄 Refreshing user list after update');
        } else {
            console.log('\n❌ Update failed:', updateResponse.data.message);
        }

    } catch (error) {
        console.error('❌ Error in edit user test:', error.response?.data || error.message);
    }
}

// Run the test
testEditUserFunctionality();
