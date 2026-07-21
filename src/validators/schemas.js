const Joi = require('joi');

const downloadSchema = Joi.object({
  url: Joi.string().uri().required(),
  saveToHistory: Joi.boolean().default(true),
});

module.exports = { downloadSchema };
