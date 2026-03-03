// Test utility to verify Bangladesh address data structure
// Run this in browser console to test: import('./utils/testAddressData.js').then(m => m.testAddressData())

export async function testAddressData() {
  try {
    console.log('🧪 Testing Bangladesh Address Data...\n');

    // Fetch all address files
    const [divisionsRes, districtsRes, upazilasRes, unionsRes] = await Promise.all([
      fetch('/divisions.json'),
      fetch('/districts.json'),
      fetch('/upazilas.json'),
      fetch('/unions.json'),
    ]);

    const [divisionsData, districtsData, upazilasData, unionsData] = await Promise.all([
      divisionsRes.json(),
      districtsRes.json(),
      upazilasRes.json(),
      unionsRes.json(),
    ]);

    // Extract data from PHPMyAdmin export format
    const extractData = (jsonArray) => {
      const dataObj = jsonArray.find(item => item.type === 'table');
      return dataObj ? dataObj.data : [];
    };

    const divisions = extractData(divisionsData);
    const districts = extractData(districtsData);
    const upazilas = extractData(upazilasData);
    const unions = extractData(unionsData);

    console.log('✅ Divisions loaded:', divisions.length);
    console.log('Sample division:', divisions[0]);
    console.log('\n✅ Districts loaded:', districts.length);
    console.log('Sample district:', districts[0]);
    console.log('\n✅ Upazilas loaded:', upazilas.length);
    console.log('Sample upazila:', upazilas[0]);
    console.log('\n✅ Unions loaded:', unions.length);
    console.log('Sample union:', unions[0]);

    // Test cascading logic
    console.log('\n🔗 Testing Cascading Logic:');
    const testDivisionId = divisions[0].id;
    const filteredDistricts = districts.filter(d => d.division_id === testDivisionId);
    console.log(`Districts in division ${divisions[0].name}:`, filteredDistricts.length);

    if (filteredDistricts.length > 0) {
      const testDistrictId = filteredDistricts[0].id;
      const filteredUpazilas = upazilas.filter(u => u.district_id === testDistrictId);
      console.log(`Upazilas in district ${filteredDistricts[0].name}:`, filteredUpazilas.length);

      if (filteredUpazilas.length > 0) {
        const testUpazilaId = filteredUpazilas[0].id;
        const filteredUnions = unions.filter(u => u.upazilla_id === testUpazilaId);
        console.log(`Unions in upazila ${filteredUpazilas[0].name}:`, filteredUnions.length);
      }
    }

    console.log('\n✅ All address data loaded successfully!');
    return { divisions, districts, upazilas, unions };
  } catch (error) {
    console.error('❌ Error testing address data:', error);
    throw error;
  }
}

// Auto-run if in development
if (import.meta.env.DEV) {
  console.log('💡 Tip: Run testAddressData() in console to verify address data');
}
