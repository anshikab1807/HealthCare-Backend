const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('A valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('name').optional().isString().withMessage('Name must be a string')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword
        }
      });

      return res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email
      };

      const accessToken = jwt.sign(tokenPayload, process.env.JWT_ACCESS_SECRET, {
        expiresIn: '15m'
      });

      const refreshToken = jwt.sign(tokenPayload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: '7d'
      });

      return res.status(200).json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET,
        (err, decoded) => {
          if (err) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
          }

          const newAccessToken = jwt.sign(
            { userId: decoded.userId, email: decoded.email },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: '15m' }
          );

          return res.status(200).json({
            accessToken: newAccessToken
          });
        }
      );
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
