async function testLive() {
  const lat = 12.8744;
  const lon = 80.2187;

  console.log('Testing /api/hospitals for Semmencheri (12.8744, 80.2187)...');
  const res1 = await fetch(`http://localhost:3000/api/hospitals?lat=${lat}&lon=${lon}&radius=10000&limit=5`);
  const data1 = await res1.json();
  console.log('Hospitals API status:', data1.status, 'Count:', data1.count, 'Source:', data1.source);
  console.log('Nearest hospitals near Semmencheri:', data1.data?.map(h => `${h.name} (${h.distanceKm} km away)`));

  console.log('\nTesting /api/india/hospitals/nearby...');
  const res2 = await fetch(`http://localhost:3000/api/india/hospitals/nearby?lat=${lat}&lon=${lon}&radius=50&limit=5`);
  const data2 = await res2.json();
  console.log('India Dataset status:', data2.status, 'Count:', data2.count);
  console.log('Sample India dataset:', data2.data?.map(h => `${h.name} (${h.distanceKm} km away)`));

  console.log('\nTesting /api/network-info...');
  const res3 = await fetch('http://localhost:3000/api/network-info');
  const data3 = await res3.json();
  console.log('Network info:', data3);
}
testLive();
