require('dotenv').config();
const { supabaseAdmin } = require('./src/utils/supabase');

async function setupPDFBucket() {
  try {
    const supabase = supabaseAdmin();
    
    console.log('Checking if pdf-images bucket exists...');
    
    // List all buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }
    
    console.log('Existing buckets:', buckets.map(b => b.name));
    
    // Check if pdf-images bucket exists
    const pdfBucketExists = buckets.some(bucket => bucket.name === 'pdf-images');
    
    if (pdfBucketExists) {
      console.log('✅ pdf-images bucket already exists');
    } else {
      console.log('Creating pdf-images bucket...');
      
      // Create the bucket
      const { data, error } = await supabase.storage.createBucket('pdf-images', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg'],
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (error) {
        console.error('❌ Error creating bucket:', error);
      } else {
        console.log('✅ pdf-images bucket created successfully');
      }
    }
    
    // Test upload to verify bucket is working
    console.log('Testing bucket with a sample upload...');
    const testBuffer = Buffer.from('test image data');
    const testFileName = `test_${Date.now()}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdf-images')
      .upload(testFileName, testBuffer, {
        contentType: 'image/png'
      });
    
    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError);
    } else {
      console.log('✅ Test upload successful');
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('pdf-images')
        .getPublicUrl(testFileName);
      
      console.log('Test file URL:', urlData.publicUrl);
      
      // Clean up test file
      await supabase.storage
        .from('pdf-images')
        .remove([testFileName]);
      
      console.log('✅ Test file cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupPDFBucket();