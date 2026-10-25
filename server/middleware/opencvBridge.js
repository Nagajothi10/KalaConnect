'use strict';

/**
 * OpenCV image analysis bridge.
 * Calls scripts/analyze_image.py via child_process.
 * Returns the parsed JSON result.
 */

const { execFile } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'analyze_image.py');
const TIMEOUT_MS = 30000; // 30 s

/**
 * @param {string} imagePath  Absolute path to the uploaded image on disk.
 * @returns {Promise<Object>} Parsed analysis result.
 */
function analyzeImage(imagePath) {
  return new Promise((resolve) => {
    // Try 'python' first; some systems need 'python3'
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    execFile(
      pythonCmd,
      [SCRIPT, imagePath],
      { timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          console.error('[opencv] Python process error:', err.message);
          console.error('[opencv] stderr:', stderr);
          // Return a safe fallback — never block the upload
          return resolve({
            opencv_available: false,
            error: err.message,
            quality_score: 70,
            warnings: ['OpenCV analysis unavailable — image accepted as-is.'],
          });
        }

        try {
          const result = JSON.parse(stdout.trim());
          return resolve(result);
        } catch (parseErr) {
          console.error('[opencv] JSON parse error:', parseErr.message, 'stdout:', stdout);
          return resolve({
            opencv_available: false,
            error: 'Failed to parse analysis output.',
            quality_score: 70,
            warnings: ['Image analysis output was invalid — image accepted as-is.'],
          });
        }
      }
    );
  });
}

module.exports = { analyzeImage };
