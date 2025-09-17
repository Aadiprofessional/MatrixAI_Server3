const axios = require('axios');

// Test HTML content provided by the user
const testHtmlContent = `<h1>5-Day Hong Kong Travel Plan</h1> 
 <p>Explore the vibrant city of Hong Kong with this 5-day travel itinerary. This plan covers must-see attractions, cultural experiences, and local cuisine.</p> 
 
 <h2>Day 1: Victoria Peak and Central District</h2> 
 <p>Start your journey by visiting <i>Victoria Peak</i>, offering panoramic views of Hong Kong. Take the Peak Tram for a scenic ride up the mountain. Afterward, explore the bustling <b>Central District</b>.</p> 
 <ul> 
   <li><b>Things to do:</b></li> 
   <ul> 
     <li>Visit the <u>Star Ferry</u> for a scenic boat ride across Victoria Harbour</li> 
     <li>Explore <i>Harbour City</i> for shopping and dining</li> 
     <li>Take a night tour of the city lights</li> 
   </ul> 
 </ul> 
 
 <h2>Day 2: Tsim Sha Tsui and Kowloon Peninsula</h2> 
 <p>Head to <i>Tsim Sha Tsui</i> on the Kowloon Peninsula. Enjoy the view of the Hong Kong Island skyline from the <i>Victoria Harbour</i>. Visit the <u>Museum of Art</u> and <i>Avenue of Stars</i>.</p> 
 <ul> 
   <li><b>Things to do:</b></li> 
   <ul> 
     <li>Walk along the <u>Chater Road</u></li> 
     <li>Visit the <i>Kowloon Park</i></li> 
     <li>Dine at a local dim sum restaurant</li> 
   </ul> 
 </ul> 
 
 <h2>Day 3: Disneyland Resort</h2> 
 <p>Experience the magic of <i>Hong Kong Disneyland</i>. Explore the different lands such as <i>Fantasyland</i>, <i>Tomorrowland</i>, and <i>Adventureland</i>. Don't miss the parades and fireworks.</p> 
 <ul> 
   <li><b>Things to do:</b></li> 
   <ul> 
     <li>Try the <u>Space Mountain</u> roller coaster</li> 
     <li>Attend the <i>Disney on Ice</i> show</li> 
     <li>Shop at the <i>Main Street USA</i> stores</li> 
   </ul> 
 </ul> 
 
 <h2>Day 4: Lantau Island and Big Buddha</h2> 
 <p>Travel to <i>Lantau Island</i> and visit the <u>Big Buddha</u> (Tak Tsuen). Take the <i>Ngong Ping 360</i> cable car for breathtaking views. Explore the <i>Ngong Ping Village</i> and <i>Ba Tin Monastery</i>.</p> 
 <ul> 
   <li><b>Things to do:</b></li> 
   <ul> 
     <li>Visit the <i>Man Mo Temple</i></li> 
     <li>Enjoy a meal at the <i>Long Valley Restaurant</i></li> 
     <li>Relax at the <u>Heung Yee Court</u></li> 
   </ul> 
 </ul> 
 
 <h2>Day 5: Repulse Bay and Local Markets</h2> 
 <p>End your trip with a relaxing day at <i>Repulse Bay</i>. Stroll along the beach or take a walk through the <i>Stanley Market</i> for souvenirs and local crafts. Try some street food in the area.</p> 
 <ul> 
   <li><b>Things to do:</b></li> 
   <ul> 
     <li>Visit the <i>Stanley Market</i></li> 
     <li>Try local dishes like <u>egg waffles</u> and <u>milk tea</u></li> 
     <li>Relax at the <i>Repulse Bay Beach</i></li> 
   </ul> 
 </ul>`;

// Additional test cases
const testCases = [
  {
    name: "Hong Kong Travel Plan (User Example)",
    htmlContent: testHtmlContent
  },
  {
    name: "Simple Document with Table",
    htmlContent: `
      <h1 style="color: #2c3e50;">Project Report</h1>
      <h2 style="color: #34495e;">Executive Summary</h2>
      <p>This report provides an overview of the project status and key metrics.</p>
      
      <h2 style="color: #34495e;">Key Metrics</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>Completion Rate</b></td>
            <td>85%</td>
            <td style="color: green;">On Track</td>
          </tr>
          <tr>
            <td><b>Budget Utilization</b></td>
            <td>$45,000</td>
            <td style="color: orange;">Monitor</td>
          </tr>
          <tr>
            <td><b>Team Satisfaction</b></td>
            <td>4.2/5</td>
            <td style="color: green;">Excellent</td>
          </tr>
        </tbody>
      </table>
      
      <h2 style="color: #34495e;">Recommendations</h2>
      <ol>
        <li>Continue current development pace</li>
        <li><i>Monitor budget closely</i> in the next quarter</li>
        <li>Implement <u>team feedback</u> suggestions</li>
      </ol>
    `
  },
  {
    name: "Rich Formatting Test",
    htmlContent: `
      <h1 style="color: #e74c3c;">Rich Formatting Document</h1>
      <p>This document tests various <b>bold</b>, <i>italic</i>, and <u>underlined</u> text formatting.</p>
      
      <h2 style="color: #3498db;">Text Styles</h2>
      <p><strong>Strong text</strong> and <em>emphasized text</em> should be properly formatted.</p>
      <p style="color: #27ae60;">This paragraph has green text color.</p>
      
      <h3 style="color: #9b59b6;">Lists and Formatting</h3>
      <ul>
        <li><b>Bold item</b> with normal text</li>
        <li><i>Italic item</i> with <u>underlined text</u></li>
        <li>Mixed <b><i>bold and italic</i></b> formatting</li>
      </ul>
      
      <blockquote style="border-left: 4px solid #bdc3c7; padding-left: 16px; margin: 16px 0; font-style: italic;">
        "This is a blockquote with custom styling that should be preserved in the DOCX output."
      </blockquote>
    `
  }
];

async function testHtmlToDocxAPI() {
  const baseURL = 'http://localhost:3000';
  
  console.log('🧪 Testing HTML to DOCX Conversion API\n');
  console.log('=' .repeat(60));
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📄 Test ${i + 1}: ${testCase.name}`);
    console.log('-'.repeat(40));
    
    try {
      const response = await axios.post(`${baseURL}/api/document/htmlToDocx`, {
        htmlContent: testCase.htmlContent
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`📊 Response:`, {
        success: response.data.success,
        message: response.data.message
      });
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        console.log(`\n📋 Generated DOCX Details:`);
        console.log(`   📁 File Name: ${data.fileName}`);
        console.log(`   📏 File Size: ${data.fileSize} bytes`);
        console.log(`   📝 Word Count: ${data.wordCount}`);
        console.log(`   🔤 Character Count: ${data.characterCount}`);
        console.log(`   🔗 Download URL: ${data.fileUrl}`);
        console.log(`   📄 Document Options:`, JSON.stringify(data.documentOptions, null, 2));
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.response?.status || 'Network Error'}`);
      if (error.response?.data) {
        console.log(`📋 Error Details:`, error.response.data);
      } else {
        console.log(`📋 Error Message:`, error.message);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 HTML to DOCX API Testing Complete!');
}

// Run the tests
testHtmlToDocxAPI().catch(console.error);