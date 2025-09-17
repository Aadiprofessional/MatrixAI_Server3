const axios = require('axios');

const testCsvToXlsx = async () => {
  try {
    console.log('Testing CSV to XLSX Conversion API...');
    
    const csvText = 'day,class,section,exam_subject,exam_time\n1,9th,A,Maths,09:00 AM\n1,9th,B,Science,10:00 AM\n1,9th,C,Social Studies,11:00 AM\n1,9th,D,English,12:00 PM\n1,10th,A,Physics,01:00 PM\n1,10th,B,Chemistry,02:00 PM\n1,10th,C,Biology,03:00 PM\n1,10th,D,Hindi,04:00 PM\n2,9th,A,English,09:00 AM\n2,9th,B,Social Studies,10:00 AM\n2,9th,C,Maths,11:00 AM\n2,9th,D,Science,12:00 PM\n2,10th,A,Hindi,01:00 PM\n2,10th,B,Physics,02:00 PM\n2,10th,C,Chemistry,03:00 PM\n2,10th,D,Biology,04:00 PM\n3,9th,A,Science,09:00 AM\n3,9th,B,Maths,10:00 AM\n3,9th,C,English,11:00 AM\n3,9th,D,Social Studies,12:00 PM\n3,10th,A,Biology,01:00 PM\n3,10th,B,Hindi,02:00 PM\n3,10th,C,Physics,03:00 PM\n3,10th,D,Chemistry,04:00 PM\n4,9th,A,Social Studies,09:00 AM\n4,9th,B,English,10:00 AM\n4,9th,C,Science,11:00 AM\n4,9th,D,Maths,12:00 PM\n4,10th,A,Chemistry,01:00 PM\n4,10th,B,Biology,02:00 PM\n4,10th,C,Hindi,03:00 PM\n4,10th,D,Physics,04:00 PM\n5,9th,A,Maths,09:00 AM\n5,9th,B,Science,10:00 AM\n5,9th,C,Social Studies,11:00 AM\n5,9th,D,English,12:00 PM\n5,10th,A,Physics,01:00 PM\n5,10th,B,Chemistry,02:00 PM\n5,10th,C,Biology,03:00 PM\n5,10th,D,Hindi,04:00 PM';
    
    console.log('CSV Text length:', csvText.length);
    console.log('Sample CSV data:');
    console.log(csvText.substring(0, 200) + '...');
    
    const response = await axios.post('http://localhost:3000/api/document/csvToXlsx', {
      csvText: csvText
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    
    console.log('\n✅ API Response Status:', response.status);
    console.log('✅ API Response Data:');
    console.log('Success:', response.data.success);
    console.log('Message:', response.data.message);
    
    if (response.data.data) {
      console.log('\n--- File Details ---');
      console.log('File Name:', response.data.data.fileName);
      console.log('File URL:', response.data.data.fileUrl);
      console.log('File Size:', response.data.data.fileSize, 'bytes');
      console.log('Row Count:', response.data.data.rowCount);
      console.log('Column Count:', response.data.data.columnCount);
      console.log('--- End of File Details ---\n');
      
      console.log('🎉 XLSX file is ready for download at:');
      console.log(response.data.data.fileUrl);
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
};

// Run the test
testCsvToXlsx();