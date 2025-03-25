const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
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
  }

  async uploadFile(file, requestId) {
    try {
      const key = `documents/${requestId}/${file.type}/${Date.now()}.${file.type}`;
      
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.content,
        ContentType: file.type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      await this.s3Client.send(command);
      logger.info(`Successfully uploaded file to S3: ${key}`);

      return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
      logger.error(`Failed to upload file for request ${requestId}:`, error);
      throw new Error('Failed to upload file to storage');
    }
  }
}

module.exports = new StorageService(); 