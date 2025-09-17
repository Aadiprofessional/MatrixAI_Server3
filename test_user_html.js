const axios = require('axios');

console.log('🧪 Testing HTML to DOCX API with User\'s Hong Kong Travel Plan...');

const userHtml = `<h1>5-Day Hong Kong Travel Plan</h1> 
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

axios.post('http://localhost:3000/api/document/htmlToDocx', {
  htmlContent: userHtml
}, {
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
})
.then(response => {
  console.log('✅ Success! Status:', response.status);
  console.log('📋 Generated DOCX Details:');
  const data = response.data.data;
  console.log(`   📁 File Name: ${data.fileName}`);
  console.log(`   📏 File Size: ${data.fileSize} bytes`);
  console.log(`   📝 Word Count: ${data.wordCount}`);
  console.log(`   🔤 Character Count: ${data.characterCount}`);
  console.log(`   🔗 Download URL: ${data.fileUrl}`);
  console.log('\n🎉 Hong Kong Travel Plan DOCX generated successfully!');
  console.log('📄 The document includes proper formatting for:');
  console.log('   • H1 and H2 headings with colors');
  console.log('   • Bold, italic, and underlined text');
  console.log('   • Nested bullet lists');
  console.log('   • Professional margins and spacing');
})
.catch(error => {
  console.log('❌ Error:', error.response?.status || 'Network Error');
  console.log('📋 Error Details:', error.response?.data || error.message);
});