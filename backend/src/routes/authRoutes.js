const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validate } = require('../middleware/validation');
const { authLimiter, speedLimiter } = require('../middleware/rateLimiter');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Login con rate limiting y validación
router.post('/login', 
  authLimiter, 
  speedLimiter, 
  validate('login'), 
  async (req, res, next) => {
    try {
      const { email, password } = req.validatedBody;
      
      // Buscar usuario en BD
      const user = await db.getUserByEmail(email);
      
      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ 
          error: 'Credenciales inválidas',
          code: 'INVALID_CREDENTIALS'
        });
      }
      
      // Generar token JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      
      // Log successful login
      console.log('✅ Successful login:', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
      
    } catch (error) {
      console.error('Login error:', error);
      next(error);
    }
  }
);

// Validar token
router.get('/validate', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.userId,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Logout (opcional - invalidar token en servidor)
router.post('/logout', authMiddleware, (req, res) => {
  // Aquí podrías invalidar el token en una blacklist si lo deseas
  res.json({ success: true, message: 'Sesión cerrada exitosamente' });
});

module.exports = router;
