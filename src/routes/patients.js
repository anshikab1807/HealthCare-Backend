const express = require('express');
const { body, param, validationResult } = require('express-validator');
const prisma = require('../prisma');
const { verifyAccessToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyAccessToken);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.post(
  '/',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('birthDate').isISO8601().withMessage('Valid birthDate (ISO8601) is required')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { firstName, lastName, birthDate } = req.body;

      const patient = await prisma.patient.create({
        data: {
          firstName,
          lastName,
          birthDate: new Date(birthDate),
          userId: req.user.userId
        }
      });

      return res.status(201).json(patient);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/', async (req, res, next) => {
  try {
    const patients = await prisma.patient.findMany({
      where: { userId: req.user.userId }
    });

    return res.status(200).json(patients);
  } catch (error) {
    next(error);
  }
});

router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Valid patient ID is required')],
  validate,
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);

      const patient = await prisma.patient.findFirst({
        where: {
          id,
          userId: req.user.userId
        }
      });

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      return res.status(200).json(patient);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Valid patient ID is required'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('birthDate').isISO8601().withMessage('Valid birthDate (ISO8601) is required')
  ],
  validate,
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { firstName, lastName, birthDate } = req.body;

      const existingPatient = await prisma.patient.findFirst({
        where: {
          id,
          userId: req.user.userId
        }
      });

      if (!existingPatient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const updatedPatient = await prisma.patient.update({
        where: { id },
        data: {
          firstName,
          lastName,
          birthDate: new Date(birthDate)
        }
      });

      return res.status(200).json(updatedPatient);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Valid patient ID is required'),
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('birthDate').optional().isISO8601().withMessage('Valid birthDate (ISO8601) is required')
  ],
  validate,
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { firstName, lastName, birthDate } = req.body;

      if (!firstName && !lastName && !birthDate) {
        return res.status(400).json({ error: 'At least one field must be provided to update' });
      }

      const existingPatient = await prisma.patient.findFirst({
        where: {
          id,
          userId: req.user.userId
        }
      });

      if (!existingPatient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const updateData = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (birthDate !== undefined) updateData.birthDate = new Date(birthDate);

      const updatedPatient = await prisma.patient.update({
        where: { id },
        data: updateData
      });

      return res.status(200).json(updatedPatient);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Valid patient ID is required')],
  validate,
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);

      const existingPatient = await prisma.patient.findFirst({
        where: {
          id,
          userId: req.user.userId
        }
      });

      if (!existingPatient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      await prisma.patient.delete({
        where: { id }
      });

      return res.status(200).json({ message: 'Patient deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
