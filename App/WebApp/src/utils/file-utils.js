// src/utils/file-utils.js
// Utility functions for file and directory operations
const fs = require("fs");
const path = require("path");

/**
 * Recursively finds files in a directory that match a given suffix.
 * @param {string} directory - Directory to search
 * @param {string} suffix - File suffix to match (e.g., '.routes.js')
 * @returns {string[]} Array of matching file paths
 */
function findFilesWithSuffix(directory, suffix) {
  const foundFiles = [];
  try {
    const files = fs.readdirSync(directory);
    files.forEach((file) => {
      const fullPath = path.join(directory, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        foundFiles.push(...findFilesWithSuffix(fullPath, suffix));
      } else if (file.endsWith(suffix)) {
        foundFiles.push(fullPath);
      }
    });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  return foundFiles;
}

/**
 * Recursively finds all directories named 'views' under a given directory.
 * @param {string} directory - Directory to search
 * @returns {string[]} Array of 'views' directory paths
 */
function findViewDirectories(directory) {
  const foundDirs = [];
  try {
    const files = fs.readdirSync(directory);
    files.forEach((file) => {
      const fullPath = path.join(directory, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (file === "views") {
          foundDirs.push(fullPath);
        } else {
          foundDirs.push(...findViewDirectories(fullPath));
        }
      }
    });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  return foundDirs;
}

module.exports = {
  findFilesWithSuffix,
  findViewDirectories,
};
