const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../utils/supabase');
const { extractText, renderPageAsImage, definePDFJSModule, getDocumentProxy } = require('unpdf');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Initialize unpdf with official PDF.js build for image rendering
let unpdfInitialized = false;
const initializeUnpdf = async () => {
  if (!unpdfInitialized) {
    try {
      await definePDFJSModule(() => import('pdfjs-dist'));
      unpdfInitialized = true;
      console.log('unpdf initialized with official PDF.js build');
    } catch (error) {
      console.warn('Failed to initialize unpdf with official PDF.js, using serverless build:', error.message);
      unpdfInitialized = true; // Still mark as initialized to use serverless build
    }
  }
};

// Helper function to download PDF from URL with retry logic
const downloadPDF = async (url, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Downloading PDF (attempt ${attempt}/${maxRetries}): ${url}`);
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60 second timeout for large PDFs
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/pdf,*/*',
          'Cache-Control': 'no-cache'
        },
        // Additional axios config for better network handling
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
        // DNS resolution options
        family: 0, // Use IPv4 and IPv6
        lookup: undefined // Use default DNS lookup
      });
      
      console.log(`PDF downloaded successfully: ${response.data.byteLength} bytes`);
      return Buffer.from(response.data);
      
    } catch (error) {
      lastError = error;
      console.error(`Download attempt ${attempt} failed:`, error.message);
      
      // Check if it's a network/DNS error that might benefit from retry
      const isRetryableError = 
        error.code === 'EAI_AGAIN' || // DNS resolution temporary failure
        error.code === 'ENOTFOUND' || // DNS resolution failure
        error.code === 'ECONNRESET' || // Connection reset
        error.code === 'ETIMEDOUT' || // Timeout
        error.code === 'ECONNREFUSED' || // Connection refused
        (error.response && error.response.status >= 500); // Server errors
      
      if (attempt < maxRetries && isRetryableError) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If not retryable or max retries reached, throw error
      break;
    }
  }
  
  console.error('All download attempts failed:', lastError.message);
  throw new Error(`Failed to download PDF after ${maxRetries} attempts: ${lastError.message}`);
};

// Serverless-compatible canvas implementation
const createServerlessCanvas = () => {
  return {
    getContext: (type) => {
      if (type === '2d') {
        return {
          canvas: { width: 800, height: 1000 },
          fillStyle: '#ffffff',
          strokeStyle: '#000000',
          lineWidth: 1,
          font: '12px Arial',
          textAlign: 'left',
          textBaseline: 'top',
          fillRect: () => {},
          strokeRect: () => {},
          fillText: () => {},
          strokeText: () => {},
          beginPath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          closePath: () => {},
          fill: () => {},
          stroke: () => {},
          drawImage: () => {},
          getImageData: () => ({ data: new Uint8ClampedArray(800 * 1000 * 4) }),
          putImageData: () => {},
          save: () => {},
          restore: () => {},
          translate: () => {},
          rotate: () => {},
          scale: () => {},
          transform: () => {},
          setTransform: () => {},
          clearRect: () => {}
        };
      }
      return null;
    },
    toDataURL: () => 'data:image/png;base64,',
    toBuffer: () => Buffer.alloc(0)
  };
};

// Main PDF to image conversion using unpdf with serverless compatibility
const convertPDFToImages = async (pdfBuffer) => {
  try {
    console.log('Converting PDF to images using unpdf...');
    
    // Initialize unpdf if not already done
    await initializeUnpdf();
    
    // Get document proxy to determine number of pages
    const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
    const totalPages = pdf.numPages;
    
    console.log(`PDF has ${totalPages} pages`);
    
    const images = [];
    
    // Convert each page to image
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      try {
        console.log(`Converting page ${pageNumber}/${totalPages}...`);
        
        let imageBuffer;
        let width = 800;
        let height = 1000;
        
        // Try multiple rendering approaches for serverless compatibility
        try {
          // First try: Use @napi-rs/canvas (works locally)
          console.log('Attempting @napi-rs/canvas rendering...');
          const renderPromise = renderPageAsImage(
            new Uint8Array(pdfBuffer), 
            pageNumber, 
            {
              canvasImport: () => import('@napi-rs/canvas'),
              scale: 1.5,
              width: 800,
              height: 1000
            }
          );
          
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Canvas rendering timeout')), 15000);
          });
          
          const imageArrayBuffer = await Promise.race([renderPromise, timeoutPromise]);
          imageBuffer = Buffer.from(imageArrayBuffer);
          
          const metadata = await sharp(imageBuffer).metadata();
          width = metadata.width || 800;
          height = metadata.height || 1000;
          
          console.log(`@napi-rs/canvas rendering successful: ${width}x${height}`);
          
        } catch (canvasError) {
          console.log('Canvas rendering failed, trying serverless approach:', canvasError.message);
          
          // Second try: Use serverless-compatible approach
          try {
            console.log('Attempting serverless PDF rendering...');
            
            // Use unpdf without canvas for text extraction and basic rendering
            let rawTextContent;
            try {
              rawTextContent = await extractText(new Uint8Array(pdfBuffer), pageNumber);
              console.log('Raw text content type:', typeof rawTextContent);
              console.log('Raw text content:', rawTextContent);
            } catch (extractError) {
              console.log('Text extraction failed:', extractError.message);
              rawTextContent = 'Text extraction failed: ' + extractError.message;
            }
            
            // Ensure textContent is a string and handle different return types
            let textContent = '';
            let textLines = [];
            
            try {
              if (typeof rawTextContent === 'string') {
                textContent = rawTextContent;
              } else if (rawTextContent && typeof rawTextContent === 'object') {
                // Handle case where extractText returns an object with text property
                textContent = rawTextContent.text || rawTextContent.content || JSON.stringify(rawTextContent);
              } else {
                textContent = String(rawTextContent || 'No text content available');
              }
              
              console.log(`Processed text content: ${textContent.length} characters`);
              
              // Split text into lines safely
              textLines = textContent.toString().split(/\r?\n/).filter(line => line.trim().length > 0);
              console.log(`Split into ${textLines.length} lines`);
            } catch (processingError) {
              console.log('Text processing failed:', processingError.message);
              textContent = 'Text processing failed: ' + processingError.message;
              textLines = [textContent];
            }
            
            // Create a visual representation using SVG based on extracted content
            const svgContent = `
              <svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="white" stroke="#ddd" stroke-width="1"/>
                <text x="50" y="50" font-family="Arial" font-size="16" font-weight="bold" fill="#333">
                  PDF Page ${pageNumber}
                </text>
                <text x="50" y="80" font-family="Arial" font-size="12" fill="#666">
                  Content extracted from PDF (${textContent.length} characters)
                </text>
                ${textLines.slice(0, 35).map((line, index) => 
                  `<text x="50" y="${120 + index * 25}" font-family="Arial" font-size="11" fill="#000">
                    ${line.substring(0, 80).replace(/[<>&"']/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[m])}
                  </text>`
                ).join('')}
                <text x="50" y="950" font-family="Arial" font-size="10" fill="#999">
                  Rendered in serverless mode - Page ${pageNumber} of ${totalPages}
                </text>
              </svg>
            `;
            
            imageBuffer = await sharp(Buffer.from(svgContent))
              .png()
              .resize(800, 1000)
              .toBuffer();
            
            console.log(`Serverless rendering successful: ${width}x${height}`);
            
          } catch (serverlessError) {
            console.log('Serverless rendering failed, creating placeholder:', serverlessError.message);
            throw serverlessError;
          }
        }
        
        images.push({
          pageNumber,
          buffer: imageBuffer,
          width,
          height
        });
        
        console.log(`Page ${pageNumber} converted successfully (${width}x${height})`);
        
      } catch (pageError) {
        console.error(`Error converting page ${pageNumber}:`, pageError);
        
        // Create fallback error image for failed pages
        const errorSvgContent = `
          <svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="white"/>
            <text x="400" y="500" text-anchor="middle" font-family="Arial" font-size="20" fill="red">
              Error rendering page ${pageNumber}
            </text>
            <text x="400" y="530" text-anchor="middle" font-family="Arial" font-size="14" fill="#666">
              ${pageError.message.substring(0, 50)}...
            </text>
          </svg>
        `;
        
        const errorImageBuffer = await sharp(Buffer.from(errorSvgContent))
          .png()
          .toBuffer();
        
        images.push({
          pageNumber,
          buffer: errorImageBuffer,
          width: 800,
          height: 1000,
          error: `Failed to render page ${pageNumber}: ${pageError.message}`
        });
      }
    }
    
    return {
      totalPages,
      images
    };
    
  } catch (error) {
    console.error('Error in unpdf PDF conversion:', error);
    throw new Error(`Failed to convert PDF to images: ${error.message}`);
  }
};

// Helper function to upload image to Supabase storage
const uploadImageToSupabase = async (imageBuffer, fileName) => {
  try {
    console.log('Initializing Supabase client...');
    const supabase = supabaseAdmin();
    console.log('Supabase client initialized:', !!supabase);
    console.log('Storage available:', !!supabase.storage);
    
    const { data, error } = await supabase.storage
      .from('user-uploads')
      .upload(`pdf-images/${fileName}`, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(`pdf-images/${fileName}`);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image to Supabase:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

// POST /api/pdf/convertToImages - Convert PDF pages to images
router.post('/convertToImages', async (req, res) => {
  try {
    console.log('HTTP Handler called');
    console.log('Request method:', req.method);
    console.log('Request path:', req.path);
    console.log('Request headers:', req.headers);
    console.log('Request body type:', typeof req.body);
    
    let pdfUrl;
    
    // Handle different request body formats
    if (typeof req.body === 'string') {
      console.log('Body as string:', req.body);
      try {
        const parsed = JSON.parse(req.body);
        pdfUrl = parsed.pdfUrl;
      } catch (parseError) {
        console.error('Failed to parse body as JSON:', parseError);
        return res.status(400).json({ error: 'Invalid JSON in request body' });
      }
    } else if (typeof req.body === 'object' && req.body !== null) {
      console.log('Parsed body:', req.body);
      pdfUrl = req.body.pdfUrl;
    } else {
      console.error('Unexpected body type:', typeof req.body);
      return res.status(400).json({ error: 'Invalid request body format' });
    }

    if (!pdfUrl) {
      return res.status(400).json({ error: 'PDF URL is required' });
    }

    console.log('Processing PDF:', pdfUrl);

    // Download the PDF
    const pdfBuffer = await downloadPDF(pdfUrl);
    console.log(`PDF downloaded, size: ${pdfBuffer.length} bytes`);

    // Convert PDF to images using unpdf
    const { totalPages, images } = await convertPDFToImages(pdfBuffer);

    // Upload images to Supabase and get URLs
    const imageUrls = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const fileName = `page_${image.pageNumber}_${uuidv4()}.png`;
      
      try {
        const imageUrl = await uploadImageToSupabase(image.buffer, fileName);
        imageUrls.push({
          pageNumber: image.pageNumber,
          url: imageUrl,
          width: image.width,
          height: image.height,
          error: image.error || null
        });
        console.log(`Page ${image.pageNumber} uploaded successfully`);
      } catch (uploadError) {
        console.error(`Failed to upload page ${image.pageNumber}:`, uploadError);
        imageUrls.push({
          pageNumber: image.pageNumber,
          url: null,
          width: image.width,
          height: image.height,
          error: `Upload failed: ${uploadError.message}`
        });
      }
    }

    res.json({
      success: true,
      totalPages,
      images: imageUrls
    });

  } catch (error) {
    console.error('Error in convertToImages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/pdf/extractContent - Extract text and metadata from PDF
router.post('/extractContent', async (req, res) => {
  try {
    const { pdfUrl } = req.body;

    if (!pdfUrl) {
      return res.status(400).json({ error: 'PDF URL is required' });
    }

    console.log('Extracting content from PDF:', pdfUrl);

    // Download the PDF
    const pdfBuffer = await downloadPDF(pdfUrl);
    console.log(`PDF downloaded, size: ${pdfBuffer.length} bytes`);

    // Extract text using unpdf
    const { totalPages, text } = await extractText(new Uint8Array(pdfBuffer), { mergePages: false });

    res.json({
      success: true,
      totalPages,
      content: Array.isArray(text) ? text : [text]
    });

  } catch (error) {
    console.error('Error extracting PDF content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'pdf-service',
    engine: 'unpdf'
  });
});

module.exports = router;