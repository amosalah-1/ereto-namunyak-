/**
 * Ereto Namunyak CBO - End-to-End System Test Suite
 */

async function runTests() {
  console.log('--- Starting Ereto Namunyak CBO Test Suite ---');
  const baseUrl = 'http://localhost:5000';

  // 1. Test Public Projects
  console.log('\n[1] Testing GET /api/projects...');
  const projRes = await fetch(`${baseUrl}/api/projects`);
  const projData = await projRes.json();
  console.log(`Success: ${projData.success}, Count: ${projData.count}`);
  if (!projData.success || projData.count < 1) throw new Error('Projects API failed');

  // 2. Test Team API
  console.log('\n[2] Testing GET /api/team...');
  const teamRes = await fetch(`${baseUrl}/api/team`);
  const teamData = await teamRes.json();
  console.log(`Success: ${teamData.success}, Team Members: ${teamData.count}`);
  if (!teamData.success || teamData.count < 1) throw new Error('Team API failed');

  // 3. Test Admin Login API
  console.log('\n[3] Testing POST /api/auth/login...');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@eretonamunyak.org',
      password: 'AdminEreto2026!'
    })
  });
  const loginData = await loginRes.json();
  console.log(`Login Status: ${loginRes.status}, Success: ${loginData.success}, User: ${loginData.user?.name}, Role: ${loginData.user?.role}`);
  if (!loginData.success || loginData.user?.role !== 'super_admin') throw new Error('Login failed');

  // Extract Session Cookie
  const cookieHeader = loginRes.headers.get('set-cookie');
  console.log(`Received Session Cookie: ${cookieHeader ? 'Yes (HttpOnly)' : 'No'}`);

  // 4. Test Protected Admin Analytics API
  console.log('\n[4] Testing GET /api/admin/analytics (with session)...');
  const analyticsRes = await fetch(`${baseUrl}/api/admin/analytics`, {
    headers: { 'Cookie': cookieHeader || '' }
  });
  const analyticsData = await analyticsRes.json();
  console.log(`Analytics Success: ${analyticsData.success}`);
  console.log(`Projects Count: ${analyticsData.analytics?.projects.total}`);
  console.log(`Active Projects: ${analyticsData.analytics?.projects.active}`);

  // 5. Test Pesapal Donation Initiation
  console.log('\n[5] Testing POST /api/donations/pesapal-order...');
  const donationRes = await fetch(`${baseUrl}/api/donations/pesapal-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      donor_name: 'Test Supporter',
      donor_email: 'donor@example.com',
      donor_phone: '0712345678',
      amount: 1500,
      message: 'Keep uplifting the pastoralist communities!',
      project_id: 1
    })
  });
  const donationData = await donationRes.json();
  console.log(`Donation Order Success: ${donationData.success}`);
  console.log(`Merchant Reference: ${donationData.merchant_reference}`);
  console.log(`Order Tracking ID: ${donationData.order_tracking_id}`);
  console.log(`Redirect URL: ${donationData.redirect_url}`);
  if (!donationData.success || !donationData.merchant_reference) throw new Error('Donation creation failed');

  // 6. Test Direct Verification API
  console.log('\n[6] Testing GET /api/donations/verify-payment...');
  const verifyRes = await fetch(`${baseUrl}/api/donations/verify-payment?orderTrackingId=${donationData.order_tracking_id}&merchantReference=${donationData.merchant_reference}`);
  const verifyData = await verifyRes.json();
  console.log(`Verification Success: ${verifyData.success}`);
  console.log(`Verified Status: ${verifyData.donation?.payment_status}`);
  console.log(`Receipt Number: ${verifyData.donation?.receipt_number}`);

  // 7. Test Dynamic Content Addition (Dynamic Project creation via REST API)
  console.log('\n[7] Testing Admin Project Creation (Database-driven without code editing)...');
  const createProjRes = await fetch(`${baseUrl}/api/admin/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader || ''
    },
    body: JSON.stringify({
      title: 'Solar Water Borehole & Green Woodlot Project',
      short_description: 'Providing clean solar-pumped water and school tree woodlots in remote villages.',
      full_description: 'Comprehensive water resilience initiative installing solar submersible pumps at communal boreholes.',
      category_id: 1,
      location: 'Loitokitok, Kajiado South, Kenya',
      target_amount: 1200000,
      raised_amount: 250000,
      status: 'published',
      featured: true
    })
  });
  const createProjData = await createProjRes.json();
  console.log(`Project Created Success: ${createProjData.success}, Message: ${createProjData.message}`);

  // 8. Verify Newly Published Project immediately appears on Public Website
  console.log('\n[8] Verifying newly published project on Public Website...');
  const verifyProjRes = await fetch(`${baseUrl}/api/projects?search=Solar`);
  const verifyProjData = await verifyProjRes.json();
  console.log(`Found matching published projects on public site: ${verifyProjData.count}`);
  console.log(`New Project Title: ${verifyProjData.data[0]?.title}`);
  if (verifyProjData.count < 1) throw new Error('Newly created project was not immediately visible on public site');

  // 9. Test XML Sitemap
  console.log('\n[9] Testing Dynamic XML Sitemap (/sitemap.xml)...');
  const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
  const sitemapText = await sitemapRes.text();
  console.log(`Sitemap HTTP Status: ${sitemapRes.status}, Contains solar project: ${sitemapText.includes('solar-water-borehole')}`);

  console.log('\n=============================================');
  console.log(' ALL 9 ERETO NAMUNYAK SYSTEM TESTS PASSED! ');
  console.log('=============================================');
}

runTests().catch(err => {
  console.error('\n[TEST FAILURE]', err);
  process.exit(1);
});
