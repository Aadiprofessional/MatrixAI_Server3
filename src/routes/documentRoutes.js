const express = require('express');
const axios = require('axios');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../utils/supabase');
const HTMLtoDOCX = require('html-to-docx');

const router = express.Router();

// Helper function to download file from URL
const downloadFile = async (url) => {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error downloading file:', error.message);
    throw new Error(`Failed to download file: ${error.message}`);
  }
};

// Helper function to extract text from DOCX
const extractTextFromDocx = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error('Failed to extract text from DOCX file');
  }
};

// Helper function to extract text from DOC (basic text extraction)
const extractTextFromDoc = async (buffer) => {
  try {
    // For .doc files, we'll do a basic text extraction
    // This is a simplified approach - for production, consider using a more robust library
    const text = buffer.toString('utf8');
    // Remove non-printable characters and clean up
    const cleanText = text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
                         .replace(/\s+/g, ' ')
                         .trim();
    return cleanText;
  } catch (error) {
    console.error('Error extracting text from DOC:', error);
    throw new Error('Failed to extract text from DOC file');
  }
};

// Document text extraction endpoint
router.all('/extractText', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Request to /extractText endpoint:', req.method);
  console.log('Request body:', req.body);
  
  try {
    const { documentUrl } = req.body;
    
    // Validate required parameters
    if (!documentUrl) {
      return res.status(400).json({ 
        success: false,
        message: 'documentUrl is required' 
      });
    }

    // Validate URL format
    let url;
    try {
      url = new URL(documentUrl);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format'
      });
    }

    // Check file extension
    const fileName = url.pathname.toLowerCase();
    const isDocx = fileName.endsWith('.docx');
    const isDoc = fileName.endsWith('.doc');
    
    if (!isDocx && !isDoc) {
      return res.status(400).json({
        success: false,
        message: 'Only .doc and .docx files are supported'
      });
    }

    // Download the document
    console.log('Downloading document from:', documentUrl);
    const fileBuffer = await downloadFile(documentUrl);
    console.log('Document downloaded, size:', fileBuffer.length, 'bytes');

    // Extract text based on file type
    let extractedText;
    if (isDocx) {
      console.log('Extracting text from DOCX file...');
      extractedText = await extractTextFromDocx(fileBuffer);
    } else {
      console.log('Extracting text from DOC file...');
      extractedText = await extractTextFromDoc(fileBuffer);
    }

    console.log('Text extraction completed, length:', extractedText.length, 'characters');

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Text extracted successfully',
      data: {
        documentUrl,
        fileType: isDocx ? 'docx' : 'doc',
        extractedText,
        characterCount: extractedText.length
      }
    });

  } catch (error) {
    console.error('Error in document text extraction:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// CSV to XLSX conversion endpoint
router.all('/csvToXlsx', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Request to /csvToXlsx endpoint:', req.method);
  console.log('Request body:', req.body);
  
  try {
    const { csvText } = req.body;
    
    // Validate required parameters
    if (!csvText) {
      return res.status(400).json({ 
        success: false,
        message: 'csvText is required' 
      });
    }

    console.log('Processing CSV text, length:', csvText.length);
    
    // Enhanced CSV parsing to handle various formats
    const parseCSV = (csvText) => {
      const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
      const rows = [];
      
      for (const line of lines) {
        const row = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"' && (i === 0 || line[i-1] === ',')) {
            inQuotes = true;
          } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
            inQuotes = false;
          } else if (char === ',' && !inQuotes) {
            row.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        row.push(current.trim());
        rows.push(row);
      }
      
      return rows;
    };
    
    // Parse CSV with enhanced parser
    const rows = parseCSV(csvText);
    
    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid data found in CSV text'
      });
    }
    
    // Create a new workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    
    // Add cell styling and padding
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    // Set column widths for better padding
    const colWidths = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      let maxWidth = 10; // minimum width
      for (let row = range.s.r; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const cellLength = String(cell.v).length;
          maxWidth = Math.max(maxWidth, cellLength + 4); // add padding
        }
      }
      colWidths.push({ width: Math.min(maxWidth, 50) }); // cap at 50 for readability
    }
    worksheet['!cols'] = colWidths;
    
    // Apply cell formatting with padding
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        if (cell) {
          // Add cell styling
          cell.s = {
            alignment: {
              horizontal: 'left',
              vertical: 'center',
              wrapText: true
            },
            border: {
              top: { style: 'thin', color: { rgb: 'CCCCCC' } },
              bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
              left: { style: 'thin', color: { rgb: 'CCCCCC' } },
              right: { style: 'thin', color: { rgb: 'CCCCCC' } }
            },
            fill: {
              fgColor: { rgb: row === 0 ? 'F0F0F0' : 'FFFFFF' } // header row highlighting
            }
          };
          
          // Add font styling for header row
          if (row === 0) {
            cell.s.font = {
              bold: true,
              color: { rgb: '333333' }
            };
          }
        }
      }
    }
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    
    // Generate XLSX buffer
    const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    console.log('XLSX file generated, size:', xlsxBuffer.length, 'bytes');
    
    // Generate unique filename
    const fileId = uuidv4();
    const fileName = `converted_${fileId}.xlsx`;
    const storagePath = `excel-files/${fileName}`;
    
    // Upload to Supabase storage
    const supabase = supabaseAdmin();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(storagePath, xlsxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload XLSX file to storage',
        error: uploadError.message
      });
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(storagePath);
    
    const fileUrl = urlData.publicUrl;
    console.log('XLSX file uploaded successfully:', fileUrl);
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'CSV converted to XLSX successfully',
      data: {
        fileName: fileName,
        fileUrl: fileUrl,
        fileSize: xlsxBuffer.length,
        rowCount: rows.length,
        columnCount: rows[0] ? rows[0].length : 0
      }
    });
    
  } catch (error) {
    console.error('Error in CSV to XLSX conversion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert CSV to XLSX',
      error: error.message
    });
  }
});

// HTML to DOCX conversion endpoint
router.all('/htmlToDocx', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Request to /htmlToDocx endpoint:', req.method);
  console.log('Request body:', req.body);
  
  try {
    const { htmlContent } = req.body;
    
    // Validate required parameters
    if (!htmlContent) {
      return res.status(400).json({ 
        success: false,
        message: 'htmlContent is required' 
      });
    }

    console.log('Processing HTML content, length:', htmlContent.length);
    
    // Clean HTML content to remove problematic elements
    const cleanedHtml = htmlContent
      // Remove ``` at the beginning of content
      .replace(/^\s*```[a-zA-Z]*\s*/i, '')
      // Remove ``` at the end of content
      .replace(/\s*```\s*$/i, '')
      // Remove backticks around URLs in img tags
      .replace(/src="\s*`([^`]+)`\s*"/g, 'src="$1"')
      // Remove extra spaces around URLs
      .replace(/src="\s+([^"]+)\s+"/g, 'src="$1"')
      // Fix malformed image tags
      .replace(/src="\s*`\s*([^`\s]+)\s*`\s*"/g, 'src="$1"')
      // Remove problematic image attributes that might cause errors
      .replace(/<img([^>]*)\s+alt="[^"]*undefined[^"]*"([^>]*)>/gi, '<img$1$2>')
      .replace(/<img([^>]*)\s+src="[^"]*undefined[^"]*"([^>]*)>/gi, '')
      // Remove empty or malformed img tags
      .replace(/<img[^>]*src=""[^>]*>/gi, '')
      .replace(/<img[^>]*src="\s*"[^>]*>/gi, '')
      // Fix self-closing img tags
      .replace(/<img([^>]*)(?<!\/)>/gi, '<img$1 />')
      // Remove any remaining backticks
      .replace(/`/g, '')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      // Remove any null or undefined text
      .replace(/\bundefined\b/gi, '')
      .replace(/\bnull\b/gi, '');
    
    // Ensure HTML content is properly formatted
    let formattedHtml = cleanedHtml;
    
    // Add DOCTYPE and html/body tags if not present
    if (!cleanedHtml.includes('<!DOCTYPE') && !cleanedHtml.includes('<html')) {
      formattedHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  /* Force override any default styling */
  * {
    font-size: inherit !important;
    line-height: inherit !important;
  }
  
  body { 
    font-family: 'Calibri', 'Arial', sans-serif !important; 
    font-size: 9pt !important; 
    line-height: 1.1 !important; 
    margin: 0 !important; 
    padding: 0 !important;
    color: #000000 !important;
  }
  
  h1 { 
    font-size: 11pt !important; 
    font-weight: bold !important; 
    color: #2c3e50 !important; 
    margin: 0 0 6pt 0 !important; 
    padding: 0 !important;
    page-break-after: avoid !important;
  }
  
  h2 { 
    font-size: 10pt !important; 
    font-weight: bold !important; 
    color: #34495e !important; 
    margin: 4pt 0 3pt 0 !important; 
    padding: 0 !important;
    page-break-after: avoid !important;
  }
  
  h3 { 
    font-size: 9.5pt !important; 
    font-weight: bold !important; 
    color: #34495e !important; 
    margin: 3pt 0 2pt 0 !important; 
    padding: 0 !important;
    page-break-after: avoid !important;
  }
  
  h4 { 
    font-size: 9pt !important; 
    font-weight: bold !important; 
    color: #34495e !important; 
    margin: 2pt 0 1pt 0 !important; 
    padding: 0 !important;
    page-break-after: avoid !important;
  }
  
  h5 { 
    font-size: 9pt !important; 
    font-weight: bold !important; 
    color: #34495e !important; 
    margin: 2pt 0 1pt 0 !important; 
    padding: 0 !important;
    page-break-after: avoid !important;
  }
  
  h6 { 
    font-size: 8.5pt !important; 
    font-weight: bold !important; 
    color: #34495e !important; 
    margin: 2pt 0 1pt 0 !important; 
    padding: 0 !important;
    page-break-after: avoid !important;
  }
  
  p { 
    margin: 0 0 3pt 0 !important; 
    padding: 0 !important;
    text-align: justify !important;
    font-size: 9pt !important;
    line-height: 1.1 !important;
  }
  
  ul, ol { 
    margin: 1pt 0 3pt 0 !important; 
    padding-left: 12pt !important;
    font-size: 9pt !important;
  }
  
  li { 
    margin: 0.5pt 0 !important; 
    padding: 0 !important;
    line-height: 1.05 !important;
    font-size: 9pt !important;
  }
  
  b, strong { 
    font-weight: bold !important; 
    font-size: inherit !important;
  }
  
  i, em { 
    font-style: italic !important; 
    font-size: inherit !important;
  }
  
  u { 
    text-decoration: underline !important; 
    font-size: inherit !important;
  }
  
  blockquote {
    margin: 2pt 0 2pt 12pt !important;
    padding-left: 8pt !important;
    border-left: 2pt solid #bdc3c7 !important;
    font-style: italic !important;
    font-size: 8.5pt !important;
  }
  
  table { 
    border-collapse: collapse !important; 
    width: 100% !important; 
    margin: 3pt 0 !important; 
    font-size: 8pt !important;
  }
  
  th, td { 
    border: 1px solid #bdc3c7 !important; 
    padding: 2pt !important; 
    text-align: left !important; 
    font-size: 8pt !important;
  }
  
  th { 
    background-color: #ecf0f1 !important; 
    font-weight: bold !important;
  }
  
  img {
    max-width: 100% !important;
    height: auto !important;
    margin: 3pt 0 !important;
    display: block !important;
  }
  
  /* Remove any default margins/padding that might cause blank pages */
  html {
    margin: 0 !important;
    padding: 0 !important;
  }
</style>
</head>
<body>
${cleanedHtml}
</body>
</html>`;
    } else {
      // If HTML is already complete, just clean it up
      formattedHtml = cleanedHtml;
    }
    
    // Document options for compact, professional formatting
    const documentOptions = {
      orientation: 'portrait',
      pageSize: {
        width: 12240, // 8.5 inches in TWIP
        height: 15840 // 11 inches in TWIP
      },
      margins: {
        top: 360,     // 0.25 inch - minimal top margin
        right: 720,   // 0.5 inch
        bottom: 360,  // 0.25 inch - minimal bottom margin
        left: 720,    // 0.5 inch
        header: 0,    // No header to prevent blank page
        footer: 0     // No footer to prevent blank page
      },
      title: 'Generated Document',
      creator: 'MatrixAI Server',
      font: 'Calibri',
      fontSize: 18, // 9pt in HIP (Half of point) - smaller default
      lineNumber: false,
      pageNumber: false,
      // Additional options to prevent blank pages
      pageBreakBefore: false,
      pageBreakAfter: false
    };
    
    // Convert HTML to DOCX with error handling
    console.log('Converting HTML to DOCX...');
    let docxBuffer;
    
    try {
      // First attempt with full options
      docxBuffer = await HTMLtoDOCX(formattedHtml, null, documentOptions, null);
    } catch (firstError) {
      console.warn('First conversion attempt failed:', firstError.message);
      
      try {
        // Second attempt with minimal options
        const minimalOptions = {
          orientation: 'portrait',
          margins: {
            top: 720,
            right: 720,
            bottom: 720,
            left: 720
          }
        };
        docxBuffer = await HTMLtoDOCX(formattedHtml, null, minimalOptions, null);
        console.log('Conversion succeeded with minimal options');
      } catch (secondError) {
        console.warn('Second conversion attempt failed:', secondError.message);
        
        try {
          // Third attempt with no options (library defaults)
          docxBuffer = await HTMLtoDOCX(formattedHtml);
          console.log('Conversion succeeded with default options');
        } catch (thirdError) {
          console.warn('Third conversion attempt failed:', thirdError.message);
          
          // Final attempt with ultra-clean HTML
          const ultraCleanHtml = formattedHtml
            .replace(/<img[^>]*>/gi, '') // Remove all images
            .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove scripts
            .replace(/<style[^>]*>.*?<\/style>/gis, '') // Remove inline styles
            .replace(/style="[^"]*"/gi, '') // Remove style attributes
            .replace(/class="[^"]*"/gi, '') // Remove class attributes
            .replace(/id="[^"]*"/gi, ''); // Remove id attributes
            
          docxBuffer = await HTMLtoDOCX(ultraCleanHtml);
          console.log('Conversion succeeded with ultra-clean HTML');
        }
      }
    }
    
    console.log('DOCX file generated, size:', docxBuffer.length, 'bytes');
    
    // Generate unique filename
    const fileId = uuidv4();
    const fileName = `document_${fileId}.docx`;
    const storagePath = `docx-files/${fileName}`;
    
    // Upload to Supabase storage
    const supabase = supabaseAdmin();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(storagePath, docxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Error uploading DOCX to Supabase:', uploadError);
      throw new Error('Failed to upload DOCX file to storage');
    }
    
    console.log('DOCX file uploaded successfully:', uploadData.path);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(storagePath);
    
    const publicUrl = urlData.publicUrl;
    console.log('Public URL generated:', publicUrl);
    
    // Calculate document statistics
    const wordCount = formattedHtml.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = formattedHtml.replace(/<[^>]*>/g, '').length;
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'HTML converted to DOCX successfully',
      data: {
        fileName,
        fileUrl: publicUrl,
        fileSize: docxBuffer.length,
        wordCount,
        characterCount,
        documentOptions
      }
    });

  } catch (error) {
    console.error('Error in HTML to DOCX conversion:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;