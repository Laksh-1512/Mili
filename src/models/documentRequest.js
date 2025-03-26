const Joi = require('joi');

const documentRequestSchema = Joi.object({
  header: Joi.string().required(),
  content: Joi.string().required(),
  footer: Joi.string().required().optional(),
  documentType: Joi.string().valid('pdf', 'docx').required(),
  watermark: Joi.object({
    type: Joi.string().valid('text', 'image').required(),
    content: Joi.string().required(),
  }).optional(),
  placeholders: Joi.object().pattern(
    Joi.string(),
    Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())
  ).optional()
}).required();

module.exports = {
  documentRequestSchema
}; 