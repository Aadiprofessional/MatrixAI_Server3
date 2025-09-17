const axios = require('axios');

// Test various edge cases that might cause "unsupported file type: undefined" error
const testCases = [
  {
    name: "HTML with undefined in image src",
    html: '<html><body><h1>Test</h1><img src="undefined" alt="test" /><p>Content</p></body></html>'
  },
  {
    name: "HTML with backticks in image src",
    html: '<html><body><h1>Test</h1><img src=" `https://example.com/image.jpg` " alt="test" /><p>Content</p></body></html>'
  },
  {
    name: "HTML with malformed image tags",
    html: '<html><body><h1>Test</h1><img src="" alt="undefined image" ><p>Content</p></body></html>'
  },
  {
    name: "HTML with code blocks",
    html: '```html\n<html><body><h1>Test</h1><p>Content</p></body></html>\n```'
  },
  {
    name: "Plain HTML without DOCTYPE",
    html: '<h1>Simple Test</h1><p>Just content without full HTML structure</p>'
  },
  {
    name: "User's original problematic HTML",
    html: '<html>\n<head>\n    <title>5-Day Hong Kong Itinerary</title>\n</head>\n<body>\n    <h1>5-Day Hong Kong Travel Plan</h1>\n    \n    <p>Discover the vibrant city of Hong Kong with this comprehensive 5-day itinerary that balances iconic landmarks, cultural experiences, and local cuisine. This plan offers a perfect mix of modern attractions and traditional charm.</p>\n    \n    <h2>Day 1: Arrival & Central District Exploration</h2>\n    <ul>\n        <li>Arrive at Hong Kong International Airport (HKIA)</li>\n        <li>Check into hotel in Central or Tsim Sha Tsui</li>\n        <li>Visit Victoria Peak for panoramic city views</li>\n        <li>Stroll along the Avenue of Stars in Tsim Sha Tsui</li>\n        <li>Dinner at a traditional dim sum restaurant</li>\n    </ul>\n    \n    <img src=" `https://example.com/victoria-peak.jpg` " alt="Victoria Peak view of Hong Kong skyline" />\n    \n    <h3>Day 2: Cultural Heritage & Temple Street Night Market</h3>\n    <p>Explore Hong Kong\'s rich history and vibrant street life:</p>\n    \n    <ol>\n        <li>Visit Man Mo Temple (Hong Kong\'s oldest temple)</li>\n        <li>Walk through the historic Tai Ping Shan area</li>\n        <li>Experience the bustling Temple Street Night Market</li>\n        <li>Try local street food like egg tarts and fish balls</li>\n        <li>Optional: Enjoy a night cruise on Victoria Harbour</li>\n    </ol>\n    \n    <h2>Day 3: Day Trip to Lantau Island</h2>\n    <ul>\n        <li>Take the Ngong Ping cable car to Big Buddha</li>\n        <li>Explore Po Lin Monastery</li>\n        <li>Visit the serene Tian Tan Buddha statue</li>\n        <li>Enjoy lunch at one of the monastery restaurants</li>\n        <li>Return to Hong Kong Island by ferry</li>\n    </ul>\n    \n    <img src=" `https://example.com/big-buddha-lantau.jpg` " alt="Big Buddha statue on Lantau Island" />\n    \n    <h3>Day 4: Modern Hong Kong & Shopping</h3>\n    <p>Experience Hong Kong\'s cutting-edge architecture and shopping:</p>\n    \n    <ol>\n        <li>Visit the International Finance Centre (IFC) observation deck</li>\n        <li>Explore the Ocean Park for marine life and attractions</li>\n        <li>Shop at the luxury boutiques of Central and Lan Kwai Fong</li>\n        <li>Have dinner at a rooftop restaurant with harbor views</li>\n        <li>Optional: Watch a performance at the Hong Kong Cultural Centre</li>\n    </ol>\n    \n    <h2>Day 5: Nature & Departure</h2>\n    <ul>\n        <li>Take a morning hike in the New Territories\' country parks</li>\n        <li>Visit the Hong Kong Wetland Park for wildlife viewing</li>\n        <li>Grab last-minute souvenirs at Mong Kok market</li>\n        <li>Head to the airport for departure</li>\n    </ul>\n    \n    <blockquote>\n        "Hong Kong is a city where ancient traditions meet futuristic innovation—a truly unique destination that never fails to impress." - Travel Magazine\n    </blockquote>\n    \n    <h3>Travel Tips for Hong Kong</h3>\n    <ul>\n        <li>Use the Octopus card for public transportation and convenience stores</li>\n        <li>Wear comfortable shoes for walking on hilly terrain</li>\n        <li>Carry light rain gear—sudden showers are common</li>\n        <li>Learn basic Cantonese phrases for better communication</li>\n        <li>Respect local customs, especially when visiting temples</li>\n    </ul>\n</body>\n</html>'
  }
];

async function testHtmlToDocx(testCase) {
  try {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    
    const response = await axios.post('http://localhost:3000/api/document/htmlToDocx', {
      htmlContent: testCase.html
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    if (response.status === 200) {
      console.log('✅ Success! Status:', response.status);
      console.log('📄 File:', response.data.data.fileName);
      console.log('📊 Stats:', {
        fileSize: response.data.data.fileSize,
        wordCount: response.data.data.wordCount,
        characterCount: response.data.data.characterCount
      });
    } else {
      console.log('⚠️ Unexpected status:', response.status);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status || 'Network Error');
    console.log('📋 Error Details:', error.response?.data || error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive HTML to DOCX edge case tests...');
  
  for (const testCase of testCases) {
    await testHtmlToDocx(testCase);
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 All tests completed!');
}

runAllTests().catch(console.error);