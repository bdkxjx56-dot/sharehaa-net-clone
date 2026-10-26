const https = require('https');
const http = require('http');

// Source Cloudinary (القديم)
const SOURCE_CLOUD_NAME = 'davv3wvky';
const SOURCE_API_KEY = '491536732313493';
const SOURCE_API_SECRET = 'j14ypQ29NA__eEsaLS0kRT-OBNk';

// Destination Cloudinary (الجديد)
const DEST_CLOUD_NAME = 'xewytpw1';
const DEST_API_KEY = '633154872911571';
const DEST_API_SECRET = 'FedThAPYCFsbT9FAcJDZopCZ484';

let totalUploaded = 0;
let totalFailed = 0;

/**
 * Fetch all images from source Cloudinary
 */
function fetchSourceImages(nextCursor = null, allResources = []) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${SOURCE_API_KEY}:${SOURCE_API_SECRET}`).toString('base64');
    
    let url = `/v1_1/${SOURCE_CLOUD_NAME}/resources/image?max_results=500`;
    if (nextCursor) {
      url += `&next_cursor=${nextCursor}`;
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
            reject(new Error(`Error fetching: ${JSON.stringify(response)}`));
            return;
          }

          const resources = response.resources || [];
          allResources.push(...resources);

          console.log(`✓ تم جلب ${resources.length} صورة من المصدر (الإجمالي: ${allResources.length})`);

          if (response.next_cursor) {
            fetchSourceImages(response.next_cursor, allResources)
              .then(resolve)
              .catch(reject);
          } else {
            resolve(allResources);
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Upload image to destination Cloudinary
 */
function uploadToDestination(imageUrl, publicId) {
  return new Promise((resolve, reject) => {
    const timestamp = Math.round(Date.now() / 1000);
    const crypto = require('crypto');
    
    // Generate signature
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${DEST_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');
    
    const formData = {
      file: imageUrl,
      public_id: publicId,
      timestamp: timestamp,
      api_key: DEST_API_KEY,
      signature: signature
    };

    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2);
    let body = '';
    
    for (const key in formData) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      body += `${formData[key]}\r\n`;
    }
    body += `--${boundary}--\r\n`;

    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${DEST_CLOUD_NAME}/image/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body)
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
          
          if (res.statusCode === 200) {
            resolve(response);
          } else {
            reject(new Error(`Upload failed: ${JSON.stringify(response)}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Migrate all images
 */
async function migrateImages() {
  try {
    console.log('🚀 بدء عملية النقل من Cloudinary القديم إلى الجديد...\n');
    
    // Fetch all images from source
    console.log('📥 جاري جلب جميع الصور من المصدر...');
    const images = await fetchSourceImages();
    
    console.log(`\n✓ تم جلب ${images.length} صورة من المصدر`);
    console.log('📤 بدء رفع الصور إلى الوجهة الجديدة...\n');
    
    // Upload each image to destination
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const progress = `[${i + 1}/${images.length}]`;
      
      try {
        console.log(`${progress} جاري رفع: ${image.public_id}`);
        
        await uploadToDestination(image.secure_url, image.public_id);
        
        totalUploaded++;
        console.log(`${progress} ✓ تم الرفع بنجاح: ${image.public_id}\n`);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        totalFailed++;
        console.error(`${progress} ✗ فشل الرفع: ${image.public_id}`);
        console.error(`   السبب: ${error.message}\n`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 ملخص عملية النقل');
    console.log('='.repeat(80));
    console.log(`✓ تم رفعها بنجاح: ${totalUploaded}`);
    console.log(`✗ فشل رفعها: ${totalFailed}`);
    console.log(`📦 الإجمالي: ${images.length}`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ حدث خطأ:', error.message);
  }
}

// Start migration
migrateImages();
