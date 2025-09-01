const joi = require('joi');
const validator = require('validator');

const schemas = {
  login: joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(8).required()
  }),
  
  createUser: joi.object({
    name: joi.string().min(3).max(255).pattern(/^[a-zA-Z\s]+$/).required(),
    email: joi.string().email().required(),
    password: joi.string().min(8).pattern(/^(?=.*[A-Z])(?=.*[0-9])/).required(),
    role: joi.string().valid('admin', 'user').required()
  }),
  
  updateUser: joi.object({
    name: joi.string().min(3).max(255).pattern(/^[a-zA-Z\s]+$/).optional(),
    email: joi.string().email().optional(),
    role: joi.string().valid('admin', 'user').optional()
  })
};

const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return res.status(500).json({ error: 'Invalid validation schema' });
    }
    
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      console.warn('Input validation failed', {
        schema: schemaName,
        error: error.details,
        requestBody: req.body,
        userId: req.user?.id,
        ip: req.ip
      });
      
      return res.status(400).json({
        error: 'Datos inválidos',
        code: 'VALIDATION_ERROR',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }
    
    // Sanitize strings
    Object.keys(value).forEach(key => {
      if (typeof value[key] === 'string') {
        value[key] = validator.escape(value[key]);
      }
    });
    
    req.validatedBody = value;
    next();
  };
};

module.exports = { validate };
