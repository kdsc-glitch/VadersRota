// Simple test script to debug team member creation
// Run with: node debug-team-member.js

async function testTeamMemberCreation() {
  const testData = {
    name: "Test User",
    email: "test@example.com",
    region: "us"
  };

  try {
    console.log('Testing team member creation with data:', testData);
    
    const response = await fetch('http://localhost:5000/api/team-members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseData = await response.text();
    console.log('Response body:', responseData);

    if (!response.ok) {
      console.error('Request failed with status:', response.status);
      try {
        const errorData = JSON.parse(responseData);
        console.error('Error details:', errorData);
      } catch (e) {
        console.error('Could not parse error response as JSON');
      }
    } else {
      console.log('Success! Team member created.');
      try {
        const createdMember = JSON.parse(responseData);
        console.log('Created member:', createdMember);
      } catch (e) {
        console.error('Could not parse success response as JSON');
      }
    }

  } catch (error) {
    console.error('Network error:', error.message);
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch('http://localhost:5000/api/team-members');
    console.log('Server is running, status:', response.status);
    return true;
  } catch (error) {
    console.error('Server not reachable:', error.message);
    console.log('Make sure the server is running with: npm run dev');
    return false;
  }
}

async function main() {
  console.log('=== Team Member Creation Debug Script ===');
  
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testTeamMemberCreation();
  }
}

main().catch(console.error);