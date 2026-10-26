require('dotenv').config();
const https = require('https');

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'davv3wvky';
const API_KEY = process.env.CLOUDINARY_API_KEY || '491536732313493';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || 'j14ypQ29NA__eEsaLS0kRT-OBNk';

/**
 * Fetch all images from Cloudinary
 * @param {string} nextCursor - Pagination cursor
 * @param {Array} allResources - Accumulated resources
 */
function fetchCloudinaryImages(nextCursor = null, allResources = []) {
  const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
  
  let url = `/v1_1/${CLOUD_NAME}/resources/image`;
  if (nextCursor) {
    url += `?next_cursor=${nextCursor}`;
  }
  
  const options = {
    hostname: 'api.cloudinary.com',
    path: url,
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        
        if (res.statusCode !== 200) {
          console.error('Error:', response);
          return;
        }

        const resources = response.resources || [];
        allResources.push(...resources);

        console.log(`✓ تم جلب ${resources.length} صورة (الإجمالي: ${allResources.length})`);

        // If there's a next cursor, fetch more images
        if (response.next_cursor) {
          console.log('جاري جلب المزيد من الصور...\n');
          fetchCloudinaryImages(response.next_cursor, allResources);
        } else {
          // No more pages, display results
          displayResults(allResources);
        }
      } catch (error) {
        console.error('Error parsing response:', error);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request error:', error);
  });

  req.end();
}

/**
 * Display the fetched images
 * @param {Array} resources - All fetched resources
 */
function displayResults(resources) {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 إجمالي عدد الصور: ${resources.length}`);
  console.log('='.repeat(80) + '\n');

  resources.forEach((resource, index) => {
    console.log(`${index + 1}. ${resource.public_id}`);
    console.log(`   URL: ${resource.secure_url}`);
    console.log(`   النوع: ${resource.format}`);
    console.log(`   الحجم: ${(resource.bytes / 1024).toFixed(2)} KB`);
    console.log(`   الأبعاد: ${resource.width}x${resource.height}`);
    console.log(`   تاريخ الإنشاء: ${resource.created_at}`);
    console.log('');
  });

  // Save to JSON file
  const fs = require('fs');
  const outputPath = './cloudinary-images.json';
  fs.writeFileSync(outputPath, JSON.stringify(resources, null, 2));
  console.log(`✓ تم حفظ البيانات في: ${outputPath}`);
}

// Start fetching
console.log('🚀 جاري جلب الصور من Cloudinary...\n');
fetchCloudinaryImages();
