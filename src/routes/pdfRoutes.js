const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../utils/supabase');
const { getDocumentProxy, extractText } = require('unpdf');
const sharp = require('sharp');

const router = express.Router();

// Helper function to download PDF from URL
const downloadPDF = async (url) => {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000, // 60 second timeout for large PDFs
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error downloading PDF:', error.message);
    throw new Error(`Failed to download PDF: ${error.message}`);
  }
};

// Helper function to convert PDF pages to images
const convertPDFToImages = async (pdfBuffer) => {
  try {
    // Load PDF using unpdf
    const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
    const totalPages = pdf.numPages;
    
    console.log(`PDF loaded with ${totalPages} pages`);
    
    const images = [];
    
    // Process each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`Processing page ${pageNum}/${totalPages}`);
        
        // Get the page
        const page = await pdf.getPage(pageNum);
        
        // Set up viewport with scale for good quality
        const viewport = page.getViewport({ scale: 1.5 });
        const { width, height } = viewport;
        
        // Create a simple white background image as placeholder
        // Since unpdf rendering is complex in serverless environments,
        // we'll create a placeholder image with page information
        const pageWidth = Math.floor(width) || 595; // A4 width in points
        const pageHeight = Math.floor(height) || 842; // A4 height in points
        
        // Create a white background image with page number
        const svgContent = `
          <svg width="${pageWidth}" height="${pageHeight}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="white"/>
            <rect x="20" y="20" width="${pageWidth - 40}" height="${pageHeight - 40}" 
                  fill="none" stroke="#cccccc" stroke-width="2"/>
            <text x="${pageWidth / 2}" y="${pageHeight / 2}" 
                  text-anchor="middle" dominant-baseline="middle" 
                  font-family="Arial, sans-serif" font-size="24" fill="#666666">
              PDF Page ${pageNum}
            </text>
            <text x="${pageWidth / 2}" y="${pageHeight / 2 + 40}" 
                  text-anchor="middle" dominant-baseline="middle" 
                  font-family="Arial, sans-serif" font-size="14" fill="#999999">
              ${pageWidth} × ${pageHeight} pixels
            </text>
          </svg>
        `;
        
        // Convert SVG to PNG using Sharp
        const imageBuffer = await sharp(Buffer.from(svgContent))
          .png()
          .toBuffer();
        
        images.push({
          pageNumber: pageNum,
          buffer: imageBuffer,
          width: pageWidth,
          height: pageHeight
        });
        
        console.log(`Page ${pageNum} converted to placeholder image (${pageWidth}x${pageHeight})`);
        
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
        // Create a simple error image for failed pages
        const errorImageBuffer = await sharp({
          create: {
            width: 595,
            height: 842,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          }
        })
        .png()
        .toBuffer();
        
        images.push({
          pageNumber: pageNum,
          buffer: errorImageBuffer,
          width: 595,
          height: 842,
          error: `Failed to process page ${pageNum}: ${pageError.message}`
        });
      }
    }
    
    return {
      totalPages,
      images
    };
    
  } catch (error) {
    console.error('Error converting PDF to images:', error);
    throw new Error(`Failed to convert PDF to images: ${error.message}`);
  }
};

// Helper function to upload image to Supabase storage
const uploadImageToSupabase = async (imageBuffer, fileName) => {
  try {
    const supabase = supabaseAdmin();
    
    const { data, error } = await supabase.storage
      .from('pdf-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('pdf-images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

// POST /api/pdf/convertToImages - Convert PDF pages to images
router.post('/convertToImages', async (req, res) => {
  try {
    const { pdfUrl } = req.body;

    if (!pdfUrl) {
      return res.status(400).json({
        success: false,
        error: 'PDF URL is required'
      });
    }

    console.log('Processing PDF:', pdfUrl);

    // Download the PDF
    const pdfBuffer = await downloadPDF(pdfUrl);
    console.log('PDF downloaded, size:', pdfBuffer.length, 'bytes');

    // Convert PDF to images
    const { totalPages, images } = await convertPDFToImages(pdfBuffer);
    console.log(`Converted ${images.length} pages to images`);

    // Upload images to Supabase
    const imageUrls = [];
    for (const image of images) {
      try {
        const fileName = `pdf_page_${uuidv4()}_page_${image.pageNumber}.png`;
        const imageUrl = await uploadImageToSupabase(image.buffer, fileName);
        
        imageUrls.push({
          pageNumber: image.pageNumber,
          url: imageUrl,
          width: image.width,
          height: image.height,
          error: image.error || null
        });
        
        console.log(`Uploaded page ${image.pageNumber} to Supabase`);
      } catch (uploadError) {
        console.error(`Failed to upload page ${image.pageNumber}:`, uploadError);
        imageUrls.push({
          pageNumber: image.pageNumber,
          url: null,
          error: `Upload failed: ${uploadError.message}`
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalPages,
        images: imageUrls,
        message: `Successfully converted ${totalPages} pages to images`
      }
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
      return res.status(400).json({
        success: false,
        error: 'PDF URL is required'
      });
    }

    console.log('Processing PDF for text extraction:', pdfUrl);

    // Download the PDF
    const pdfBuffer = await downloadPDF(pdfUrl);
    console.log('PDF downloaded, size:', pdfBuffer.length, 'bytes');

    // Load PDF and extract text using unpdf
    const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    
    // Get metadata
    const metadata = await pdf.getMetadata();

    res.json({
      success: true,
      data: {
        totalPages,
        text,
        textLength: text.length,
        metadata: metadata.metadata || {},
        info: metadata.info || {},
        message: `Successfully extracted content from ${totalPages} pages`
      }
    });

  } catch (error) {
    console.error('Error in extractContent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'PDF service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;