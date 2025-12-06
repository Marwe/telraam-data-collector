/**
 * File Service
 *
 * Low-level file system operations with consistent error handling.
 * Provides atomic file operations and directory management.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { FILESYSTEM } from '../utils/constants.js';
import { createLogger, LOG_NAMESPACES } from '../utils/index.js';
import { isFileSystemError } from '../utils/validation.js';

const logger = createLogger(LOG_NAMESPACES.STORAGE);

/**
 * Handles all file system I/O operations
 */
export class FileService {
  /**
   * Ensure a directory exists, creating it if necessary
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      logger.error(`Error creating directory ${dirPath}`, error);
      throw new Error(
        `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Write JSON data to a file atomically
   */
  async writeJson<T>(filePath: string, data: T, context: string): Promise<void> {
    await this.ensureDirectory(path.dirname(filePath));

    try {
      const json = JSON.stringify(data, null, FILESYSTEM.JSON_INDENT);
      await fs.writeFile(filePath, json, FILESYSTEM.ENCODING);
    } catch (error) {
      logger.error(`Error while ${context}`, error);
      throw new Error(
        `Failed while ${context}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Read JSON data from a file
   * Returns null if file doesn't exist
   */
  async readJson<T>(filePath: string, context: string): Promise<T | null> {
    try {
      const data = await fs.readFile(filePath, FILESYSTEM.ENCODING);
      return JSON.parse(data) as T;
    } catch (error: unknown) {
      if (isFileSystemError(error) && error.code === 'ENOENT') {
        return null;
      }
      logger.error(`Error while ${context}`, error);
      throw new Error(
        `Failed while ${context}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete a file if it exists
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.rm(filePath, { force: true });
    } catch (error) {
      logger.warn(`Could not delete file ${filePath}`, error);
    }
  }

  /**
   * Recursively collect all JSON files in a directory
   */
  async collectJsonFiles(rootDir: string): Promise<string[]> {
    const results: string[] = [];
    const entries = await fs.readdir(rootDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        const nested = await this.collectJsonFiles(fullPath);
        results.push(...nested);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * Write text content to a file
   */
  async writeText(filePath: string, content: string, context: string): Promise<void> {
    await this.ensureDirectory(path.dirname(filePath));

    try {
      await fs.writeFile(filePath, content, FILESYSTEM.ENCODING);
    } catch (error) {
      logger.error(`Error while ${context}`, error);
      throw new Error(
        `Failed while ${context}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
