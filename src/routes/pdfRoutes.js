const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../utils/supabase');
const pdf = require('pdf-parse');

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

// Helper function to extract text and metadata from PDF
const extractPDFContent = async (pdfBuffer) => {
  try {
    // Parse PDF to extract text and metadata
    const data = await pdf(pdfBuffer);
    
    return {
      text: data.text,
      totalPages: data.numpages,
      metadata: data.metadata || {},
      info: data.info || {}
    };
  } catch (error) {
    console.error('Error extracting PDF content:', error);
    throw new Error(`Failed to extract PDF content: ${error.message}`);
  }
};

// Helper function to save PDF content to Supabase storage (optional)
const savePDFContentToSupabase = async (content, fileName) => {
  try {
    const supabase = supabaseAdmin();
    
    const { data, error } = await supabase.storage
      .from('pdf-content')
      .upload(fileName, JSON.stringify(content, null, 2), {
        contentType: 'application/json',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('pdf-content')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    throw new Error(`Failed to upload content: ${error.message}`);
  }
};

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

    console.log('Processing PDF:', pdfUrl);

    // Download the PDF
    const pdfBuffer = await downloadPDF(pdfUrl);
    console.log('PDF downloaded, size:', pdfBuffer.length, 'bytes');

    // Extract content from PDF
    const pdfContent = await extractPDFContent(pdfBuffer);
    console.log(`Extracted content from ${pdfContent.totalPages} pages`);

    // Optionally save content to Supabase (commented out to avoid storage costs)
    // const fileName = `pdf_content_${uuidv4()}.json`;
    // const contentUrl = await savePDFContentToSupabase(pdfContent, fileName);

    res.json({
      success: true,
      data: {
        totalPages: pdfContent.totalPages,
        text: pdfContent.text,
        metadata: pdfContent.metadata,
        info: pdfContent.info,
        textLength: pdfContent.text.length,
        message: `Successfully extracted content from ${pdfContent.totalPages} pages`
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

// Legacy endpoint for backward compatibility - redirects to extractContent
router.all('/convertToImages', async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    const { pdfUrl } = req.body;

    if (!pdfUrl) {
      return res.status(400).json({
        success: false,
        error: 'PDF URL is required'
      });
    }

    console.log('Processing PDF (legacy endpoint):', pdfUrl);

    // Download the PDF
    const pdfBuffer = await downloadPDF(pdfUrl);
    console.log('PDF downloaded, size:', pdfBuffer.length, 'bytes');

    // Extract content from PDF
    const pdfContent = await extractPDFContent(pdfBuffer);
    console.log(`Extracted content from ${pdfContent.totalPages} pages`);

    // Return content in a format similar to the old image response
    res.json({
      success: true,
      data: {
        totalPages: pdfContent.totalPages,
        text: pdfContent.text,
        textLength: pdfContent.text.length,
        metadata: pdfContent.metadata,
        info: pdfContent.info,
        message: `Successfully extracted content from ${pdfContent.totalPages} pages`,
        note: 'This endpoint now returns text content instead of images for serverless compatibility'
      }
    });

  } catch (error) {
    console.error('Error in convertToImages (legacy):', error);
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