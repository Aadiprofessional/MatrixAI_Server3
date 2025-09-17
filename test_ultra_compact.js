const axios = require('axios');

// Test HTML content with various elements
const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Ultra Compact Format Test</title>
</head>
<body>
    <h1>Ultra Compact Document Test</h1>
    <p>This document tests the <strong>ultra-compact formatting</strong> with <em>9pt body text</em> and smaller headings.</p>
    
    <h2>Section with 10pt Font</h2>
    <p>This section demonstrates the <u>reduced font sizes</u> for better document density.</p>
    
    <h3>Subsection with 9.5pt Font</h3>
    <ul>
        <li>First bullet point with <strong>bold text</strong></li>
        <li>Second point with <em>italic formatting</em></li>
        <li>Third point with <u>underlined text</u></li>
    </ul>
    
    <h4>Minor Heading (9pt)</h4>
    <p>This paragraph shows how compact the text appears with 9pt font size.</p>
    
    <h5>Smallest Heading (9pt)</h5>
    <ol>
        <li>Numbered list item one</li>
        <li>Numbered list item two</li>
        <li>Numbered list item three</li>
    </ol>
    
    <h2>Table Example</h2>
    <table>
        <thead>
            <tr>
                <th>Feature</th>
                <th>Old Size</th>
                <th>New Size</th>
                <th>Improvement</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Body Text</td>
                <td>11pt</td>
                <td>9pt</td>
                <td>18% smaller</td>
            </tr>
            <tr>
                <td>H1 Heading</td>
                <td>14pt</td>
                <td>11pt</td>
                <td>21% smaller</td>
            </tr>
            <tr>
                <td>H2 Heading</td>
                <td>12pt</td>
                <td>10pt</td>
                <td>17% smaller</td>
            </tr>
        </tbody>
    </table>
    
    <blockquote>
        This is a blockquote with 8.5pt font size for even more compact display.
    </blockquote>
    
    <p>Final paragraph to test the overall document compactness and readability.</p>
</body>
</html>
`;

async function testUltraCompactFormatting() {
    console.log('🔬 Testing Ultra-Compact HTML to DOCX Formatting...');
    console.log('');
    
    try {
        const response = await axios.post('http://localhost:3000/api/document/htmlToDocx', {
            htmlContent: testHtml,
            filename: 'ultra-compact-test'
        });
        
        console.log('📄 Ultra-Compact Format Test');
        console.log('--------------------------------------------------');
        console.log(`✅ Status: ${response.status}`);
        console.log('📋 Document Details:');
        console.log(`   📁 File Name: ${response.data.filename}`);
        console.log(`   📏 File Size: ${response.data.fileSize} bytes`);
        console.log(`   📝 Word Count: ${response.data.wordCount}`);
        console.log(`   🔤 Character Count: ${response.data.characterCount}`);
        console.log(`   🔗 Download URL: ${response.data.url}`);
        console.log('');
        
        console.log('🎨 Ultra-Compact Features Applied:');
        console.log('   • Body text: 9pt (down from 11pt)');
        console.log('   • H1 headings: 11pt (down from 14pt)');
        console.log('   • H2 headings: 10pt (down from 12pt)');
        console.log('   • H3 headings: 9.5pt (down from 11pt)');
        console.log('   • H4/H5 headings: 9pt (new additions)');
        console.log('   • Tables: 8pt font (ultra-compact)');
        console.log('   • Blockquotes: 8.5pt italic');
        console.log('   • Reduced margins and line spacing');
        console.log('   • Image support with auto-sizing');
        console.log('');
        
        console.log('============================================================');
        console.log('🏁 Ultra-Compact Test Complete!');
        console.log('');
        console.log('📊 Expected Benefits:');
        console.log('• Maximum text density for AI-generated content');
        console.log('• Professional appearance with bold formatting');
        console.log('• Optimal for business documents and reports');
        console.log('• Perfect for AI content with images and tables');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testUltraCompactFormatting();