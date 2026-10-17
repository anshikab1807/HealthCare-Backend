
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
    body('specialty').trim().notEmpty().withMessage('Specialty is required')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { firstName, lastName, specialty } = req.body;

      const doctor = await prisma.doctor.create({
        data: {
          firstName,
          lastName,
          specialty
        }
      });

      return res.status(201).json(doctor);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/', async (req, res, next) => {
  try {
    const doctors = await prisma.doctor.findMany();
    return res.status(200).json(doctors);
  } catch (error) {
    next(error);
  }
});

router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Valid doctor ID is required')],
  validate,
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);

      const doctor = await prisma.doctor.findUnique({
        where: { id }
      });

      if (!doctor) {
        return res.status(404).json({ error: 'Doctor not found' });
      }

      return res.status(200).json(doctor);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Valid doctor ID is required'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('specialty').trim().notEmpty().withMessage('Specialty is required')
  ],
  validate,
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { firstName, lastName, specialty } = req.body;

      const existingDoctor = await prisma.doctor.findUnique({
        where: { id }
      });

      if (!existingDoctor) {
        return res.status(404).json({ error: 'Doctor not found' });
      }

      const updatedDoctor = await prisma.doctor.update({
        where: { id },
        data: {
          firstName,
          lastName,
          specialty
        }
      });

      return res.status(200).json(updatedDoctor);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Valid doctor ID is required'),
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('specialty').optional().trim().notEmpty().withMessage('Specialty cannot be empty')
  ],
  validate,
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { firstName, lastName, specialty } = req.body;

      if (!firstName && !lastName && !specialty) {
        return res.status(400).json({ error: 'At least one field must be provided to update' });
      }

      const existingDoctor = await prisma.doctor.findUnique({
        where: { id }
      });

      if (!existingDoctor) {
        return res.status(404).json({ error: 'Doctor not found' });
      }

      const updateData = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (specialty !== undefined) updateData.specialty = specialty;

      const updatedDoctor = await prisma.doctor.update({
        where: { id },
        data: updateData
      });

      return res.status(200).json(updatedDoctor);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Valid doctor ID is required')],
  validate,
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);

      const existingDoctor = await prisma.doctor.findUnique({
        where: { id }
      });

      if (!existingDoctor) {
        return res.status(404).json({ error: 'Doctor not found' });
      }

      await prisma.doctor.delete({
        where: { id }
      });

      return res.status(200).json({ message: 'Doctor deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
