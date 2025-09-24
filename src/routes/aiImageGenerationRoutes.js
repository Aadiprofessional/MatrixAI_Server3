// aiImageGenerationRoutes.js
const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const router = express.Router();

// === Supabase client setup ===
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase config');
  return createClient(supabaseUrl, supabaseKey);
};

// === Coin deduction helper ===
const deductCoins = async (uid, coinAmount, transactionName) => {
  try {
    const response = await axios.post('https://main-matrixai-server-lujmidrakh.cn-hangzhou.fcapp.run/api/user/subtractCoins', {
      uid,
      coinAmount,
      transaction_name: transactionName,
    });
    return response.data;
  } catch (err) {
    console.error('Coin deduction failed:', err.response?.data || err.message);
    return { success: false, message: 'Coin deduction API failed' };
  }
};

// === Detect if description is asking for a chart/graph ===
const isChartDescription = (description) => {
  const chartKeywords = [
    'chart', 'graph', 'plot', 'bar chart', 'line chart', 'pie chart', 'scatter plot',
    'histogram', 'data visualization', 'sales data', 'statistics', 'metrics',
    'comparison', 'trend', 'analytics', 'dashboard', 'report', 'dataset',
    'bar graph', 'line graph', 'pie graph', 'donut chart', 'area chart',
    'bubble chart', 'radar chart', 'polar chart', 'treemap'
  ];
  
  const lowerDescription = description.toLowerCase();
  return chartKeywords.some(keyword => lowerDescription.includes(keyword));
};

// === Generate chart configuration using Qwen-max ===
const generateChartConfig = async (description) => {
  try {
    const prompt = `Generate a Chart.js configuration object to create a chart or visualization based on this description: "${description}"

Requirements:
1. Return a valid Chart.js configuration object in JSON format
2. Include appropriate chart type (bar, line, pie, doughnut, scatter, etc.)
3. Generate realistic sample data that matches the description
4. Include proper styling with colors, labels, and legends
5. Set appropriate options for responsive design
6. Include title, axis labels where applicable
7. Use professional color schemes
8. Make the data meaningful and relevant to the description

Return only the JSON configuration object, no explanations or markdown formatting.

Example format:
{
  "type": "bar",
  "data": {
    "labels": ["Jan", "Feb", "Mar"],
    "datasets": [{
      "label": "Sales",
      "data": [100, 200, 150],
      "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56"]
    }]
  },
  "options": {
    "responsive": true,
    "plugins": {
      "title": {
        "display": true,
        "text": "Monthly Sales"
      }
    }
  }
}`;

    const response = await axios.post('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      model: 'qwen-max',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    }, {
      headers: {
        'Authorization': 'Bearer sk-9f7b91a0bb81406b9da7ff884ddd2592',
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.choices && response.data.choices[0]) {
      const rawConfig = response.data.choices[0].message.content.trim();
      console.log('Raw config from Qwen-max:', rawConfig.substring(0, 100) + '...');
      
      // Clean and parse the JSON configuration
      const cleanedConfig = rawConfig.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const chartConfig = JSON.parse(cleanedConfig);
      
      console.log('Parsed chart config:', JSON.stringify(chartConfig, null, 2).substring(0, 200) + '...');
      return chartConfig;
    } else {
      throw new Error('Invalid response from Qwen-max API');
    }
  } catch (error) {
    console.error('Error generating chart config:', error);
    throw new Error('Failed to generate chart configuration: ' + error.message);
  }
};

// === Generate SVG code for general image descriptions ===
const generateSVGCode = async (description) => {
  try {
    const prompt = `Generate a complete, valid SVG code for the following description: "${description}"

Requirements:
1. Create a complete SVG with proper XML declaration and namespace
2. Use appropriate viewBox dimensions (e.g., 0 0 800 600)
3. Include proper styling with colors, gradients, and visual appeal
4. Make the design detailed, creative, and visually interesting
5. Use SVG elements like rect, circle, path, polygon, text, etc.
6. Add appropriate colors, shadows, and visual effects
7. Ensure the SVG is self-contained and doesn't require external resources
8. Make it scalable and responsive

Return only the complete SVG code, no explanations or markdown formatting.

Example format:
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <!-- SVG content here -->
</svg>`;

    const response = await axios.post('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      model: 'qwen-max',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 3000
    }, {
      headers: {
        'Authorization': 'Bearer sk-9f7b91a0bb81406b9da7ff884ddd2592',
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.choices && response.data.choices[0]) {
      const rawSVG = response.data.choices[0].message.content.trim();
      console.log('Raw SVG from Qwen-max:', rawSVG.substring(0, 100) + '...');
      
      // Clean the SVG code by removing markdown formatting if present
      const cleanedSVG = rawSVG.replace(/```svg\n?/g, '').replace(/```xml\n?/g, '').replace(/```\n?/g, '').trim();
      
      console.log('Cleaned SVG code length:', cleanedSVG.length);
      return cleanedSVG;
    } else {
      throw new Error('Invalid response from Qwen-max API');
    }
  } catch (error) {
    console.error('Error generating SVG code:', error);
    throw new Error('Failed to generate SVG code: ' + error.message);
  }
};

// === Generate chart image using Chart.js ===
const generateChartImage = async (chartConfig, workingDir) => {
  try {
    // Generate SVG chart instead of using canvas
    const svgChart = generateSVGChart(chartConfig);
    
    // Save the SVG to a file
    const svgPath = path.join(workingDir, 'chart.svg');
    fs.writeFileSync(svgPath, svgChart);
    
    // Convert SVG to PNG using sharp
    const imagePath = path.join(workingDir, 'output.png');
    await sharp(Buffer.from(svgChart))
      .png()
      .resize(800, 600)
      .toFile(imagePath);
    
    console.log('SVG chart image generated successfully:', imagePath);
    return { success: true, imagePath };
    
  } catch (error) {
    console.error('Error generating chart image:', error);
    throw new Error(`Failed to generate chart image: ${error.message}`);
  }
};

// Generate SVG chart from Chart.js config
const generateSVGChart = (chartConfig) => {
  const { type, data, options } = chartConfig;
  const width = 800;
  const height = 600;
  const padding = 60;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;
  
  let chartSVG = '';
  
  if (type === 'pie' || type === 'doughnut') {
    chartSVG = generatePieChart(data, chartWidth, chartHeight, padding, type === 'doughnut');
  } else if (type === 'bar') {
    chartSVG = generateBarChart(data, chartWidth, chartHeight, padding);
  } else if (type === 'line') {
    chartSVG = generateLineChart(data, chartWidth, chartHeight, padding);
  } else {
    // Default to bar chart for unsupported types
    chartSVG = generateBarChart(data, chartWidth, chartHeight, padding);
  }
  
  const title = options?.plugins?.title?.text || 'Chart';
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      <text x="${width/2}" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#333">${title}</text>
      ${chartSVG}
    </svg>
  `;
};

// Generate pie/doughnut chart SVG
const generatePieChart = (data, width, height, padding, isDoughnut = false) => {
  const centerX = padding + width / 2;
  const centerY = padding + height / 2;
  const radius = Math.min(width, height) / 2 - 20;
  const innerRadius = isDoughnut ? radius * 0.4 : 0;
  
  const dataset = data.datasets[0];
  const values = dataset.data;
  const labels = data.labels;
  const colors = dataset.backgroundColor || generateColors(values.length);
  
  const total = values.reduce((sum, val) => sum + val, 0);
  let currentAngle = -Math.PI / 2; // Start from top
  
  let paths = '';
  let legends = '';
  
  values.forEach((value, index) => {
    const angle = (value / total) * 2 * Math.PI;
    const endAngle = currentAngle + angle;
    
    const x1 = centerX + Math.cos(currentAngle) * radius;
    const y1 = centerY + Math.sin(currentAngle) * radius;
    const x2 = centerX + Math.cos(endAngle) * radius;
    const y2 = centerY + Math.sin(endAngle) * radius;
    
    const largeArcFlag = angle > Math.PI ? 1 : 0;
    
    let pathData;
    if (isDoughnut) {
      const ix1 = centerX + Math.cos(currentAngle) * innerRadius;
      const iy1 = centerY + Math.sin(currentAngle) * innerRadius;
      const ix2 = centerX + Math.cos(endAngle) * innerRadius;
      const iy2 = centerY + Math.sin(endAngle) * innerRadius;
      
      pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1} Z`;
    } else {
      pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    }
    
    paths += `<path d="${pathData}" fill="${colors[index]}" stroke="white" stroke-width="2"/>`;
    
    // Add legend
    const legendY = padding + 20 + index * 25;
    legends += `
      <rect x="${padding + width + 20}" y="${legendY - 10}" width="15" height="15" fill="${colors[index]}"/>
      <text x="${padding + width + 45}" y="${legendY + 2}" font-family="Arial, sans-serif" font-size="14" fill="#333">${labels[index]} (${((value/total)*100).toFixed(1)}%)</text>
    `;
    
    currentAngle = endAngle;
  });
  
  return paths + legends;
};

// Generate bar chart SVG
const generateBarChart = (data, width, height, padding) => {
  const labels = data.labels;
  const dataset = data.datasets[0];
  const values = dataset.data;
  const colors = dataset.backgroundColor || generateColors(values.length);
  
  const maxValue = Math.max(...values);
  const barWidth = width / labels.length * 0.8;
  const barSpacing = width / labels.length * 0.2;
  
  let bars = '';
  let xLabels = '';
  
  values.forEach((value, index) => {
    const barHeight = (value / maxValue) * (height - 40);
    const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
    const y = padding + height - barHeight - 20;
    
    bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${colors[index]}" stroke="#333" stroke-width="1"/>`;
    bars += `<text x="${x + barWidth/2}" y="${y - 5}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#333">${value}</text>`;
    
    // X-axis labels
    xLabels += `<text x="${x + barWidth/2}" y="${padding + height + 15}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#333">${labels[index]}</text>`;
  });
  
  // Y-axis
  const yAxis = `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${padding + height}" stroke="#333" stroke-width="2"/>`;
  // X-axis
  const xAxis = `<line x1="${padding}" y1="${padding + height}" x2="${padding + width}" y2="${padding + height}" stroke="#333" stroke-width="2"/>`;
  
  return yAxis + xAxis + bars + xLabels;
};

// Generate line chart SVG
const generateLineChart = (data, width, height, padding) => {
  const labels = data.labels;
  const dataset = data.datasets[0];
  const values = dataset.data;
  const color = dataset.borderColor || '#36A2EB';
  
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const valueRange = maxValue - minValue || 1;
  
  const stepX = width / (labels.length - 1);
  
  let points = '';
  let line = 'M ';
  let xLabels = '';
  
  values.forEach((value, index) => {
    const x = padding + index * stepX;
    const y = padding + height - ((value - minValue) / valueRange) * (height - 40) - 20;
    
    points += `<circle cx="${x}" cy="${y}" r="4" fill="${color}" stroke="white" stroke-width="2"/>`;
    line += `${x} ${y} ${index === values.length - 1 ? '' : 'L '}`;
    
    // X-axis labels
    xLabels += `<text x="${x}" y="${padding + height + 15}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#333">${labels[index]}</text>`;
  });
  
  // Y-axis
  const yAxis = `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${padding + height}" stroke="#333" stroke-width="2"/>`;
  // X-axis
  const xAxis = `<line x1="${padding}" y1="${padding + height}" x2="${padding + width}" y2="${padding + height}" stroke="#333" stroke-width="2"/>`;
  
  const linePath = `<path d="${line}" fill="none" stroke="${color}" stroke-width="3"/>`;
  
  return yAxis + xAxis + linePath + points + xLabels;
};

// Generate colors for charts
const generateColors = (count) => {
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
  ];
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
};

// === Generate SVG image and convert to PNG ===
const generateSVGImage = async (svgCode, workingDir) => {
  try {
    console.log('Converting SVG to PNG...');
    
    // Convert SVG to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(svgCode))
      .png()
      .resize(800, 600, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .toBuffer();

    // Save the PNG file
    const outputPath = path.join(workingDir, 'output.png');
    fs.writeFileSync(outputPath, pngBuffer);
    
    console.log('SVG converted to PNG successfully');
    return { success: true, outputPath };
  } catch (error) {
    console.error('Error converting SVG to PNG:', error);
    throw new Error('Failed to convert SVG to PNG: ' + error.message);
  }
};

// === Upload image to Supabase ===storage ===
const uploadImageToSupabase = async (imagePath, uid, imageId) => {
  try {
    const supabase = getSupabaseClient();
    const imageBuffer = fs.readFileSync(imagePath);
    const fileName = `ai_generated_${imageId}.png`;
    const storagePath = `users/${uid}/ai-generated-images/${fileName}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to upload image to storage');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image to Supabase:', error);
    throw error;
  }
};

// === Main API endpoint ===
router.post('/generateImageFromDescription', async (req, res) => {
  try {
    const {
      uid,
      description,
      coinCost = 1
    } = req.body;

    // Validation
    if (!uid || !description) {
      return res.status(400).json({
        success: false,
        message: 'UID and description are required'
      });
    }

    if (description.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Description exceeds maximum limit of 1000 characters',
        currentLength: description.length,
        maxLength: 1000
      });
    }

    console.log(`Starting AI image generation for user ${uid}`);
    console.log(`Description: ${description}`);

    // Deduct coins
    const coinResult = await deductCoins(uid, coinCost, 'AI Image Generation');
    if (!coinResult.success) {
      return res.status(402).json({
        success: false,
        message: 'Insufficient coins or coin deduction failed',
        details: coinResult.message
      });
    }

    // Generate unique ID for this request
    const imageId = uuidv4();
    
    // Create temporary working directory
    const tempDir = path.join(__dirname, '../../temp', imageId);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      // Step 1: Determine if this is a chart or general image request
      const isChart = isChartDescription(description);
      console.log(`Description type detected: ${isChart ? 'Chart/Graph' : 'General Image'}`);
      
      let generatedData;
      
      if (isChart) {
        // Generate chart using Chart.js
        console.log('Generating chart configuration with Qwen-max...');
        const chartConfig = await generateChartConfig(description);
        console.log('Chart configuration generated successfully');

        console.log('Generating chart image...');
        const result = await generateChartImage(chartConfig, tempDir);
        console.log('Chart image generated successfully');
        
        generatedData = chartConfig;
      } else {
        // Generate SVG image
        console.log('Generating SVG code with Qwen-max...');
        const svgCode = await generateSVGCode(description);
        console.log('SVG code generated successfully');

        console.log('Converting SVG to PNG...');
        const result = await generateSVGImage(svgCode, tempDir);
        console.log('SVG image generated successfully');
        
        generatedData = svgCode;
      }

      // Step 2: Check if output.png was created
      const outputImagePath = path.join(tempDir, 'output.png');
      if (!fs.existsSync(outputImagePath)) {
        throw new Error('Image generation did not create output.png file');
      }

      // Step 4: Upload to Supabase storage
      console.log('Uploading image to Supabase storage...');
      const imageUrl = await uploadImageToSupabase(outputImagePath, uid, imageId);
      console.log('Image uploaded successfully:', imageUrl);

      // Step 4: Save metadata to database (optional)
      const supabase = getSupabaseClient();
      try {
        const insertData = {
          id: imageId,
          uid: uid,
          description: description,
          image_url: imageUrl,
          created_at: new Date().toISOString()
        };
        
        // Add appropriate data based on generation type
        if (isChart) {
          insertData.chart_config = JSON.stringify(generatedData);
        } else {
          insertData.svg_code = generatedData;
        }
        
        await supabase
          .from('ai_generated_images')
          .insert(insertData);
      } catch (dbError) {
        console.warn('Failed to save metadata to database:', dbError);
        // Continue anyway since the main functionality worked
      }

      // Clean up temporary directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp directory:', cleanupError);
      }

      // Return success response with image URL
      res.json({
        success: true,
        message: 'Image generated successfully',
        imageUrl: imageUrl,
        imageId: imageId,
        description: description,
        coinsDeducted: coinCost
      });

    } catch (executionError) {
      // Clean up temporary directory on error
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp directory:', cleanupError);
      }
      throw executionError;
    }

  } catch (error) {
    console.error('Error in AI image generation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate image',
      error: error.message
    });
  }
});

// === Get user's AI generated images ===
router.get('/getUserAIImages', async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'UID is required'
      });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ai_generated_images')
      .select('*')
      .eq('uid', uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch AI generated images'
      });
    }

    res.json({
      success: true,
      images: data || []
    });

  } catch (error) {
    console.error('Error fetching user AI images:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;