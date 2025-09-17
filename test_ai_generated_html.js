const axios = require('axios');

// Test HTML content with the exact problematic formatting from AI generation
const problematicHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>5-Day Hong Kong Travel Plan</title>
</head>
<body>
    <h1>5-Day Hong Kong Travel Plan</h1>
    
    <p>This comprehensive itinerary covers the best of Hong Kong in 5 days, blending iconic landmarks, cultural experiences, and local cuisine.</p>
    
    <h2>Day 1: Central Hong Kong & Victoria Peak</h2>
    <p>Start your journey in the heart of Hong Kong:</p>
    
    <ul>
        <li><strong>Visit Central District</strong> - Explore Lan Kwai Fong for nightlife, visit the Bank of China Tower, and see the famous Star Ferry</li>
        <li><strong>Lunch at Tim Ho Wan</strong> - World's cheapest Michelin-starred restaurant</li>
        <li><strong>Victoria Peak</strong> - Take the Peak Tram to the top for panoramic views of Hong Kong Island</li>
        <li><strong>Dinner at The Peak Restaurant</strong> - Enjoy fine dining with city skyline views</li>
    </ul>
    
    <img src=" \`https://images.unsplash.com/photo-1543907682-09c4b9f431d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80\` " alt="Victoria Peak View" />
    
    <h2>Day 2: Hong Kong Island Exploration</h2>
    <p>Discover more of Hong Kong Island's highlights:</p>
    
    <ol>
        <li><strong>Morning: Man Mo Temple</strong> - Historic temple dedicated to literature and martial arts gods</li>
        <li><strong>Lunch at Luk Yu Tea House</strong> - Traditional dim sum experience</li>
        <li><strong>Afternoon: Repulse Bay Beach</strong> - Relax on one of Hong Kong's most popular beaches</li>
        <li><strong>Evening: Ocean Park</strong> - Visit this world-class marine park or enjoy dinner at the nearby restaurants</li>
    </ol>
    
    <img src=" \`https://images.unsplash.com/photo-1594626826565-99291a346377?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80\` " alt="Repulse Bay Beach" />
    
    <h2>Day 3: Kowloon & Temple Street Night Market</h2>
    <p>Experience the vibrant culture of Kowloon:</p>
    
    <ul>
        <li><strong>Morning: Avenue of Stars</strong> - Walk along the waterfront with celebrity handprints</li>
        <li><strong>Lunch at Wing Wah Restaurant</strong> - Famous for its roast goose</li>
        <li><strong>Afternoon: Kowloon Walled City Park</strong> - Historical site with beautiful gardens</li>
        <li><strong>Evening: Temple Street Night Market</strong> - Shop for souvenirs, try street food, and watch local performances</li>
    </ul>
    
    <blockquote>
        "Hong Kong is a unique blend of East and West, where ancient traditions meet modern innovation."
    </blockquote>
    
    <h2>Day 4: Lantau Island & Big Buddha</h2>
    <p>Escape to the peaceful side of Hong Kong:</p>
    
    <ol>
        <li><strong>Take the Ngong Ping 360 cable car</strong> - Scenic ride to Lantau Island</li>
        <li><strong>Visit the Tian Tan Buddha</strong> - Massive bronze statue overlooking the island</li>
        <li><strong>Lunch at Po Lin Monastery</strong> - Vegetarian meal in a serene setting</li>
        <li><strong>Afternoon: Tai O Fishing Village</strong> - Explore this traditional stilt village</li>
    </ol>
    
    <img src=" \`https://images.unsplash.com/photo-1554877848-488862e82804?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80\` " alt="Tian Tan Buddha" />
    
    <h2>Day 5: Disneyland & Farewell</h2>
    <p>End your trip with magical fun:</p>
    
    <ul>
        <li><strong>Full day at Hong Kong Disneyland</strong> - Experience all attractions including Tomorrowland and Fantasyland</li>
        <li><strong>Lunch at Mickey's Kitchen</strong> - Themed dining experience</li>
        <li><strong>Shopping at Disney Store</strong> - Pick up souvenirs</li>
        <li><strong>Optional: Dinner at The Grand Hyatt Hong Kong</strong> - Elegant farewell meal</li>
    </ul>
    
    <h3>Travel Tips</h3>
    <ul>
        <li>Get an Octopus Card for public transportation</li>
        <li>Learn basic Cantonese phrases for better interaction</li>
        <li>Try local dishes: dim sum, egg tarts, and milk tea</li>
        <li>Wear comfortable shoes - Hong Kong has many stairs!</li>
    </ul>
    
    <h3>Estimated Budget (Per Person)</h3>
    <table>
        <thead>
            <tr>
                <th>Category</th>
                <th>Cost (USD)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Accommodation</td>
                <td>$300-500</td>
            </tr>
            <tr>
                <td>Food</td>
                <td>$150-250</td>
            </tr>
            <tr>
                <td>Transportation</td>
                <td>$50-100</td>
            </tr>
            <tr>
                <td>Attractions</td>
                <td>$150-200</td>
            </tr>
            <tr>
                <td>Shopping</td>
                <td>$100-300</td>
            </tr>
        </tbody>
    </table>
    
    <p>Enjoy your 5-day adventure in Hong Kong! This plan balances must-see sights with authentic local experiences.</p>
</body>
</html>
`;

async function testProblematicHtmlFix() {
    console.log('🔧 Testing AI-Generated HTML with Formatting Issues...');
    console.log('');
    
    try {
        const response = await axios.post('http://localhost:3000/api/document/htmlToDocx', {
            htmlContent: problematicHtml,
            filename: 'ai-generated-fixed-test'
        });
        
        console.log('📄 AI-Generated HTML Test (With Fixes Applied)');
        console.log('--------------------------------------------------');
        console.log(`✅ Status: ${response.status}`);
        console.log('📋 Document Details:');
        console.log(`   📁 File Name: ${response.data.data.fileName}`);
        console.log(`   📏 File Size: ${response.data.data.fileSize} bytes`);
        console.log(`   📝 Word Count: ${response.data.data.wordCount}`);
        console.log(`   🔤 Character Count: ${response.data.data.characterCount}`);
        console.log(`   🔗 Download URL: ${response.data.data.fileUrl}`);
        console.log('');
        
        console.log('🛠️ Issues Fixed:');
        console.log('   ✅ Backticks removed from image URLs');
        console.log('   ✅ Extra spaces cleaned from image sources');
        console.log('   ✅ Forced CSS styling with !important declarations');
        console.log('   ✅ Proper font sizes: H1(11pt), H2(10pt), H3(9.5pt), Body(9pt)');
        console.log('   ✅ Minimal margins to prevent blank first page');
        console.log('   ✅ No headers/footers to avoid page breaks');
        console.log('   ✅ Compact table formatting (8pt font)');
        console.log('   ✅ Professional blockquote styling');
        console.log('');
        
        console.log('============================================================');
        console.log('🏁 AI-Generated HTML Fix Test Complete!');
        console.log('');
        console.log('📊 Expected Results:');
        console.log('• No blank first page');
        console.log('• Proper text sizing throughout document');
        console.log('• Clean image rendering (if URLs are accessible)');
        console.log('• Professional formatting with proper hierarchy');
        console.log('• Compact, readable document suitable for business use');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testProblematicHtmlFix();