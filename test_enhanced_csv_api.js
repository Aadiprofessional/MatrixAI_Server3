const axios = require('axios');

// Test various CSV formats to verify dynamic handling
const testCases = [
  {
    name: 'Simple CSV with headers',
    csvText: `Name,Age,City,Country,Occupation
John Doe,30,New York,USA,Engineer
Jane Smith,25,London,UK,Designer
Bob Johnson,35,Toronto,Canada,Manager`
  },
  {
    name: 'CSV with quoted fields and commas',
    csvText: `"Product Name","Price","Description","Category"
"iPhone 15, Pro Max","$1199","Latest smartphone with advanced features","Electronics"
"Samsung Galaxy, S24","$999","High-end Android device","Electronics"
"MacBook Pro, 16-inch","$2499","Professional laptop for developers","Computers"`
  },
  {
    name: 'Large dataset with many columns',
    csvText: `ID,FirstName,LastName,Email,Phone,Address,City,State,ZipCode,Country,Department,Position,Salary,StartDate,Manager
001,Alice,Johnson,alice.j@email.com,555-0101,123 Main St,Springfield,IL,62701,USA,Engineering,Senior Developer,95000,2022-01-15,John Smith
002,Bob,Williams,bob.w@email.com,555-0102,456 Oak Ave,Chicago,IL,60601,USA,Marketing,Marketing Manager,75000,2021-03-20,Sarah Davis
003,Carol,Brown,carol.b@email.com,555-0103,789 Pine Rd,Boston,MA,02101,USA,Sales,Sales Representative,65000,2023-06-10,Mike Wilson
004,David,Miller,david.m@email.com,555-0104,321 Elm St,Seattle,WA,98101,USA,HR,HR Specialist,70000,2022-09-05,Lisa Anderson`
  },
  {
    name: 'CSV with special characters and long text',
    csvText: `Title,Author,Description,Price,Rating
"The Great Gatsby","F. Scott Fitzgerald","A classic American novel set in the Jazz Age, exploring themes of wealth, love, and the American Dream. This masterpiece captures the essence of the 1920s with its vivid characters and symbolic storytelling.","$12.99","4.5/5"
"To Kill a Mockingbird","Harper Lee","A powerful story of racial injustice and childhood innocence in the American South. This Pulitzer Prize-winning novel remains relevant today with its timeless themes of morality and justice.","$14.99","4.8/5"
"1984","George Orwell","A dystopian social science fiction novel that explores themes of totalitarianism, surveillance, and individual freedom. Orwell's vision of a controlled society continues to resonate in modern times.","$13.99","4.7/5"`
  },
  {
    name: 'Minimal CSV (2x2)',
    csvText: `A,B
1,2`
  }
];

async function testCSVToXLSXAPI() {
  console.log('Testing Enhanced CSV to XLSX API with various formats...\n');
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`Test ${i + 1}: ${testCase.name}`);
    console.log('=' .repeat(50));
    
    try {
      const response = await axios.post('http://localhost:3000/api/document/csvToXlsx', {
        csvText: testCase.csvText
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
      // Calculate some statistics
      const lines = testCase.csvText.split('\n').filter(line => line.trim());
      const estimatedRows = lines.length;
      const estimatedCols = lines[0] ? lines[0].split(',').length : 0;
      
      console.log(`Input CSV Stats:`);
      console.log(`  - Estimated Rows: ${estimatedRows}`);
      console.log(`  - Estimated Columns: ${estimatedCols}`);
      console.log(`  - Text Length: ${testCase.csvText.length} characters`);
      
      console.log(`Generated XLSX:`);
      console.log(`  - File Size: ${response.data.data.fileSize} bytes`);
      console.log(`  - Actual Rows: ${response.data.data.rowCount}`);
      console.log(`  - Actual Columns: ${response.data.data.columnCount}`);
      console.log(`  - Download URL: ${response.data.data.fileUrl}`);
      console.log(`  - File Name: ${response.data.data.fileName}`);
      
    } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
    }
    
    console.log('\n');
  }
}

testCSVToXLSXAPI();