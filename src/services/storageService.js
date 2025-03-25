const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs').promises;
const { logger } = require('../config/logger');

class StorageService {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    });
    this.bucket = process.env.AWS_BUCKET_NAME;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  async uploadFile(file, requestId) {
    try {
      const fileContent = await fs.readFile(file.path);
      const key = `documents/${requestId}/${file.type}/${Date.now()}.${file.type}`;

      await this.uploadToS3WithRetry(fileContent, key);
      const downloadUrl = await this.generatePresignedUrl(key);

      // Cleanup local file
      await this.cleanupLocalFile(file.path);

      return downloadUrl;
    } catch (error) {
      logger.error(`Failed to upload file for request ${requestId}:`, error);
      throw new Error('Failed to upload file to storage');
    }
  }

  async uploadToS3WithRetry(fileContent, key, attempt = 1) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileContent,
        ContentType: this.getContentType(key)
      });

      await this.s3Client.send(command);
      logger.info(`Successfully uploaded file to S3: ${key}`);
    } catch (error) {
      if (attempt < this.maxRetries) {
        logger.warn(`Retry attempt ${attempt} for uploading ${key}`);
        await this.delay(this.retryDelay * attempt);
        return this.uploadToS3WithRetry(fileContent, key, attempt + 1);
      }
      throw error;
    }
  }

  async generatePresignedUrl(key) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      // URL expires in 24 hours
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 24 * 60 * 60
      });

      return url;
    } catch (error) {
      logger.error('Failed to generate presigned URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  async cleanupLocalFile(filePath) {
    try {
      await fs.unlink(filePath);
      logger.info(`Cleaned up local file: ${filePath}`);
    } catch (error) {
      logger.warn(`Failed to cleanup local file ${filePath}:`, error);
      // Don't throw error for cleanup failures
    }
  }

  getContentType(key) {
    if (key.endsWith('.pdf')) {
      return 'application/pdf';
    } else if (key.endsWith('.docx')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    return 'application/octet-stream';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper method to validate S3 configuration
  validateConfig() {
    const requiredConfigs = [
      'AWS_REGION',
      'AWS_BUCKET_NAME',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY'
    ];

    const missingConfigs = requiredConfigs.filter(config => !process.env[config]);

    if (missingConfigs.length > 0) {
      throw new Error(`Missing required S3 configurations: ${missingConfigs.join(', ')}`);
    }
  }
}

module.exports = new StorageService(); 