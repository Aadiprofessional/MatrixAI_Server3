// videoSubtitleService.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const uuid = require('uuid');
const { supabaseAdmin } = require('../utils/supabase');

/**
 * Generate video with subtitles overlay
 * @param {Object} options - Configuration options
 * @param {string} options.videoUrl - URL of the source video
 * @param {Array} options.wordData - Array of word timing data
 * @param {string} options.uid - User ID
 * @param {string} options.taskId - Unique task identifier
 * @returns {Object} Result object with success status and video URL
 */
async function generateVideoWithSubtitles({ videoUrl, wordData, uid, taskId }) {
  const startTime = Date.now();
  
  try {
    console.log(`Starting video subtitle generation for task: ${taskId}`);
    
    // Create temporary directory for processing
    const tempDir = path.join(__dirname, '../../temp', taskId);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Download video file
    const videoPath = await downloadVideo(videoUrl, tempDir);
    console.log(`Video downloaded to: ${videoPath}`);
    
    // Generate subtitle file
    const subtitlePath = await generateSubtitleFile(wordData, tempDir);
    console.log(`Subtitle file generated: ${subtitlePath}`);
    
    // Process video with subtitles
    const outputVideoPath = await addSubtitlesToVideo(videoPath, subtitlePath, tempDir);
    console.log(`Video with subtitles generated: ${outputVideoPath}`);
    
    // Upload processed video to storage
    const finalVideoUrl = await uploadProcessedVideo(outputVideoPath, uid, taskId);
    console.log(`Processed video uploaded: ${finalVideoUrl}`);
    
    // Clean up temporary files
    await cleanupTempFiles(tempDir);
    
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      videoUrl: finalVideoUrl,
      processingTime: `${processingTime}ms`
    };
    
  } catch (error) {
    console.error('Error in generateVideoWithSubtitles:', error);
    
    // Clean up on error
    const tempDir = path.join(__dirname, '../../temp', taskId);
    await cleanupTempFiles(tempDir).catch(console.error);
    
    return {
      success: false,
      message: error.message || 'Failed to generate video with subtitles'
    };
  }
}

/**
 * Download video from URL
 * @param {string} videoUrl - URL of the video to download
 * @param {string} tempDir - Temporary directory path
 * @returns {string} Path to downloaded video file
 */
async function downloadVideo(videoUrl, tempDir) {
  const videoFileName = `input_${uuid.v4()}.mp4`;
  const videoPath = path.join(tempDir, videoFileName);
  
  try {
    console.log(`Downloading video from: ${videoUrl}`);
    
    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'stream',
      timeout: 300000 // 5 minutes timeout
    });
    
    const writer = fs.createWriteStream(videoPath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('Video download completed');
        resolve(videoPath);
      });
      writer.on('error', reject);
    });
    
  } catch (error) {
    console.error('Error downloading video:', error);
    throw new Error(`Failed to download video: ${error.message}`);
  }
}

/**
 * Generate SRT subtitle file from word data with 4-word segments and highlighting
 * @param {Array} wordData - Array of word timing data
 * @param {string} tempDir - Temporary directory path
 * @returns {string} Path to generated subtitle file
 */
async function generateSubtitleFile(wordData, tempDir) {
  const subtitleFileName = `subtitles_${uuid.v4()}.srt`;
  const subtitlePath = path.join(tempDir, subtitleFileName);
  
  try {
    console.log('Generating subtitle file with 4-word segments and highlighting...');
    
    let srtContent = '';
    let segmentIndex = 1;
    
    // Group words into 4-word segments
    for (let i = 0; i < wordData.length; i += 4) {
      const segment = wordData.slice(i, i + 4);
      
      if (segment.length === 0) continue;
      
      const segmentStartTime = segment[0].start;
      const segmentEndTime = segment[segment.length - 1].end;
      
      // First, show the entire segment without highlighting from segment start to first word start
      if (segmentStartTime < segment[0].start) {
        let initialSegmentText = '';
        segment.forEach((w, idx) => {
          const wordText = w.punctuated_word || w.word;
          initialSegmentText += wordText;
          if (idx < segment.length - 1) {
            initialSegmentText += ' ';
          }
        });
        
        srtContent += `${segmentIndex}\n`;
        srtContent += `${formatTime(segmentStartTime)} --> ${formatTime(segment[0].start)}\n`;
        srtContent += `${initialSegmentText}\n\n`;
        segmentIndex++;
      }
      
      // Create overlapping subtitle entries for highlighting effect
      // Each entry shows the entire segment but highlights the current word
      segment.forEach((word, wordIndex) => {
        const wordStartTime = formatTime(word.start);
        const wordEndTime = formatTime(word.end);
        
        // Build the segment text with current word highlighted
        let segmentText = '';
        segment.forEach((w, idx) => {
          const wordText = w.punctuated_word || w.word;
          if (idx === wordIndex) {
            // Highlight current word with yellow background and bold
            segmentText += `<font color="#FFFF00"><b>${wordText}</b></font>`;
          } else {
            // Regular text for other words - keep them visible
            segmentText += `<font color="#FFFFFF">${wordText}</font>`;
          }
          
          // Add space between words (except for the last word)
          if (idx < segment.length - 1) {
            segmentText += ' ';
          }
        });
        
        // Add subtitle entry for this highlighted word
        srtContent += `${segmentIndex}\n`;
        srtContent += `${wordStartTime} --> ${wordEndTime}\n`;
        srtContent += `${segmentText}\n\n`;
        
        segmentIndex++;
      });
      
      // After the last word in segment, show the entire segment without highlighting
      // until the next segment starts (if there's a gap)
      const lastWord = segment[segment.length - 1];
      const nextSegmentStart = i + 4 < wordData.length ? wordData[i + 4].start : lastWord.end;
      
      if (lastWord.end < nextSegmentStart) {
        let finalSegmentText = '';
        segment.forEach((w, idx) => {
          const wordText = w.punctuated_word || w.word;
          finalSegmentText += `<font color="#FFFFFF">${wordText}</font>`;
          if (idx < segment.length - 1) {
            finalSegmentText += ' ';
          }
        });
        
        srtContent += `${segmentIndex}\n`;
        srtContent += `${formatTime(lastWord.end)} --> ${formatTime(nextSegmentStart)}\n`;
        srtContent += `${finalSegmentText}\n\n`;
        segmentIndex++;
      }
    }
    
    fs.writeFileSync(subtitlePath, srtContent, 'utf8');
    console.log('Subtitle file with 4-word segments and highlighting generated successfully');
    
    return subtitlePath;
    
  } catch (error) {
    console.error('Error generating subtitle file:', error);
    throw new Error(`Failed to generate subtitle file: ${error.message}`);
  }
}

/**
 * Add subtitles to video using FFmpeg with HTML formatting support
 * @param {string} videoPath - Path to input video
 * @param {string} subtitlePath - Path to subtitle file
 * @param {string} tempDir - Temporary directory path
 * @returns {string} Path to output video with subtitles
 */
async function addSubtitlesToVideo(videoPath, subtitlePath, tempDir) {
  const outputFileName = `output_${uuid.v4()}.mp4`;
  const outputPath = path.join(tempDir, outputFileName);
  
  try {
    console.log('Adding subtitles with highlighting to video using FFmpeg...');
    
    // FFmpeg command to add subtitles with HTML formatting support
    const ffmpegCommand = [
      'ffmpeg',
      '-i', `"${videoPath}"`,
      '-vf', `"subtitles='${subtitlePath}':force_style='FontSize=28,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2,Alignment=2,MarginV=50'"`,
      '-c:a', 'copy',
      '-y', // Overwrite output file
      `"${outputPath}"`
    ].join(' ');
    
    console.log('Executing FFmpeg command:', ffmpegCommand);
    
    const { stdout, stderr } = await execAsync(ffmpegCommand, {
      timeout: 600000 // 10 minutes timeout
    });
    
    if (stderr) {
      console.log('FFmpeg stderr:', stderr);
    }
    
    if (!fs.existsSync(outputPath)) {
      throw new Error('Output video file was not created');
    }
    
    console.log('Video processing with highlighted subtitles completed successfully');
    return outputPath;
    
  } catch (error) {
    console.error('Error adding subtitles to video:', error);
    throw new Error(`Failed to add subtitles to video: ${error.message}`);
  }
}

/**
 * Upload processed video to storage
 * @param {string} videoPath - Path to processed video
 * @param {string} uid - User ID
 * @param {string} taskId - Task ID
 * @returns {string} URL of uploaded video
 */
async function uploadProcessedVideo(videoPath, uid, taskId) {
  try {
    console.log('Uploading processed video to Supabase storage...');
    
    const supabase = supabaseAdmin();
    const fileName = `${uid}_${taskId}_subtitled.mp4`;
    const filePath = fileName;
    
    // Read the video file
    const videoBuffer = fs.readFileSync(videoPath);
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('user-uploads')
      .upload(filePath, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });
    
    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload to Supabase: ${error.message}`);
    }
    
    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(filePath);
    
    const videoUrl = publicUrlData.publicUrl;
    console.log('Video uploaded successfully to Supabase:', videoUrl);
    return videoUrl;
    
  } catch (error) {
    console.error('Error uploading processed video:', error);
    throw new Error(`Failed to upload processed video: ${error.message}`);
  }
}

/**
 * Format time in seconds to SRT time format (HH:MM:SS,mmm)
 * @param {number} timeInSeconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(timeInSeconds) {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Clean up temporary files and directories
 * @param {string} tempDir - Temporary directory to clean up
 */
async function cleanupTempFiles(tempDir) {
  try {
    if (fs.existsSync(tempDir)) {
      console.log(`Cleaning up temporary directory: ${tempDir}`);
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('Cleanup completed');
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

module.exports = {
  generateVideoWithSubtitles
};