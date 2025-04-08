// FFmpeg Setup Script
const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');
const decompress = require('decompress');
const decompressUnzip = require('decompress-unzip');

// Configuration
const ffmpegUrl = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
const downloadPath = path.join(__dirname, 'ffmpeg-download.zip');
const ffmpegDir = path.join(__dirname, 'ffmpeg');

console.log('YouTube Downloader FFmpeg Setup');
console.log('==============================');
console.log('This script will download and set up FFmpeg for better video quality.\n');

// Check if FFmpeg is already installed
async function checkFfmpeg() {
  return new Promise((resolve) => {
    exec('ffmpeg -version', (error) => {
      if (error) {
        console.log('FFmpeg is not found in your system PATH.');
        resolve(false);
      } else {
        console.log('FFmpeg is already installed in your system!');
        resolve(true);
      }
    });
  });
}

// Download FFmpeg
function downloadFfmpeg() {
  console.log('Downloading FFmpeg...');
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(downloadPath);
    
    https.get(ffmpegUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download FFmpeg: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log('Download complete!');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(downloadPath, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

// Extract FFmpeg
async function extractFfmpeg() {
  console.log('Extracting FFmpeg...');
  
  try {
    // Make sure the directory exists
    if (!fs.existsSync(ffmpegDir)) {
      fs.mkdirSync(ffmpegDir, { recursive: true });
    }
    
    // Extract the ZIP file
    await decompress(downloadPath, ffmpegDir, {
      plugins: [decompressUnzip()]
    });
    
    console.log('Extraction complete!');
    
    // Clean up the downloaded ZIP file
    fs.unlinkSync(downloadPath);
    console.log('Cleaned up temporary files.');
    
    // Find the bin directory with ffmpeg.exe
    const ffmpegExePath = findFfmpegExePath(ffmpegDir);
    if (ffmpegExePath) {
      return ffmpegExePath;
    } else {
      throw new Error('Could not find ffmpeg.exe in the extracted files');
    }
  } catch (err) {
    console.error('Error extracting FFmpeg:', err.message);
    throw err;
  }
}

// Find ffmpeg.exe in the extracted files
function findFfmpegExePath(dir) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      // If this is the bin directory and it contains ffmpeg.exe
      if (item === 'bin' && fs.existsSync(path.join(itemPath, 'ffmpeg.exe'))) {
        return path.join(itemPath, 'ffmpeg.exe');
      }
      
      // Recursively check subdirectories
      const exePath = findFfmpegExePath(itemPath);
      if (exePath) {
        return exePath;
      }
    } else if (item === 'ffmpeg.exe') {
      return itemPath;
    }
  }
  
  return null;
}

// Add FFmpeg to system PATH (Windows only)
function addToPath(ffmpegExePath) {
  const ffmpegBinDir = path.dirname(ffmpegExePath);
  
  console.log(`\nFFmpeg installed at: ${ffmpegExePath}`);
  console.log(`\nTo use FFmpeg system-wide, add this directory to your PATH:`);
  console.log(ffmpegBinDir);
  console.log('\nYou can do this by running the following command in Command Prompt (as Administrator):');
  console.log(`setx PATH "%PATH%;${ffmpegBinDir}"`);
  
  return ffmpegBinDir;
}

// Main function
async function main() {
  try {
    // Check if FFmpeg is already installed
    const isInstalled = await checkFfmpeg();
    
    if (isInstalled) {
      console.log('\nFFmpeg is already installed on your system. No need to download.');
      console.log('You can use the YouTube Downloader with full video quality features.');
      return;
    }
    
    // Check if we already have a local installation
    if (fs.existsSync(path.join(ffmpegDir, 'bin', 'ffmpeg.exe'))) {
      console.log('\nLocal FFmpeg installation found.');
      const ffmpegExePath = path.join(ffmpegDir, 'bin', 'ffmpeg.exe');
      addToPath(ffmpegExePath);
      return;
    }
    
    // Prompt the user to continue
    console.log('\nWould you like to download and install FFmpeg for better video quality?');
    console.log('Press Enter to continue or Ctrl+C to cancel...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    // Download and extract FFmpeg
    await downloadFfmpeg();
    const ffmpegExePath = await extractFfmpeg();
    
    // Add to PATH
    addToPath(ffmpegExePath);
    
    console.log('\nSetup complete! You can now use the YouTube Downloader with full video quality features.');
    
  } catch (error) {
    console.error('\nError setting up FFmpeg:', error.message);
    console.log('You can still use the YouTube Downloader, but video quality may be limited.');
  }
}

// Run the script
main().catch(console.error).finally(() => {
  console.log('\nPress any key to exit...');
  process.stdin.once('data', () => {
    process.exit(0);
  });
});