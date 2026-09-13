const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const messages = error.details.map(d => d.message.replace(/['"]/g, ''));
    return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
  }
  next();
};

const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .message('Password must contain uppercase, lowercase, and a number'),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({ 'any.only': 'Passwords do not match' }),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  askQuestion: Joi.object({
    documentId: Joi.string().length(24).hex().required(),
    question: Joi.string().min(3).max(500).required(),
  }),

  generateQuiz: Joi.object({
    documentId: Joi.string().length(24).hex().required(),
    questionCount: Joi.number().integer().min(3).max(15).default(5),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
  }),

  submitQuiz: Joi.object({
    answers: Joi.array().items(Joi.number().integer().min(0).max(3)).required(),
    timeTaken: Joi.number().integer().min(0).default(0),
  }),
};

module.exports = { validate, schemas };
