// Quick test to verify API is working
const axios = require('axios');

async function testAPI() {
  try {
    console.log('🧪 Testing API endpoints...\n');
    
    // Test products endpoint
    const productsResponse = await axios.get('http://localhost:5000/api/products?limit=5');
    console.log('✅ Products API:');
    console.log(`   - Status: ${productsResponse.status}`);
    console.log(`   - Total products: ${productsResponse.data.pagination.totalCount}`);
    console.log(`   - Returned: ${productsResponse.data.data.length} products`);
    console.log(`   - First product: ${productsResponse.data.data[0]?.title}\n`);
    
    // Test coupons endpoint
    try {
      const couponsResponse = await axios.get('http://localhost:5000/api/coupons/active');
      console.log('✅ Coupons API:');
      console.log(`   - Status: ${couponsResponse.status}`);
      console.log(`   - Active coupons: ${couponsResponse.data.data?.length || 0}\n`);
    } catch (error) {
      console.log('⚠️  Coupons API:', error.response?.status || error.message, '\n');
    }
    
    // Test categories endpoint
    try {
      const categoriesResponse = await axios.get('http://localhost:5000/api/categories');
      console.log('✅ Categories API:');
      console.log(`   - Status: ${categoriesResponse.status}`);
      console.log(`   - Total categories: ${categoriesResponse.data.data?.length || 0}\n`);
    } catch (error) {
      console.log('⚠️  Categories API:', error.response?.status || error.message, '\n');
    }
    
    console.log('✅ All API tests completed!');
    
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

testAPI();
