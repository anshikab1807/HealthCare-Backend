const express = require('express');
const { body, param, validationResult } = require('express-validator');
const prisma = require('../prisma');
const { verifyAccessToken } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(verifyAccessToken);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const verifyPatientOwnership = async (req, res, next) => {
  try {
    const patientId = parseInt(req.params.patientId, 10);
    if (isNaN(patientId)) {
      return res.status(400).json({ error: 'Valid patient ID is required' });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        userId: req.user.userId
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    req.patient = patient;
    next();
  } catch (error) {
    next(error);
  }
};

router.post(
  '/',
  verifyPatientOwnership,
  [body('doctorId').isInt({ min: 1 }).withMessage('Valid doctorId is required')],
  validate,
  async (req, res, next) => {
    try {
      const patientId = parseInt(req.params.patientId, 10);
      const { doctorId } = req.body;

      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId }
      });

      if (!doctor) {
        return res.status(404).json({ error: 'Doctor not found' });
      }

      const existingMapping = await prisma.patientDoctorMapping.findUnique({
        where: {
          patientId_doctorId: {
            patientId,
            doctorId
          }
        }
      });

      if (existingMapping) {
        return res.status(409).json({ error: 'Mapping already exists' });
      }

      const mapping = await prisma.patientDoctorMapping.create({
        data: {
          patientId,
          doctorId
        },
        include: {
          doctor: true
        }
      });

      return res.status(201).json(mapping);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/', verifyPatientOwnership, async (req, res, next) => {
  try {
    const patientId = parseInt(req.params.patientId, 10);

    const mappings = await prisma.patientDoctorMapping.findMany({
      where: { patientId },
      include: {
        doctor: true
      }
    });

    return res.status(200).json(mappings);
  } catch (error) {
    next(error);
  }
});

router.get(
  '/:mappingId',
  verifyPatientOwnership,
  [param('mappingId').isInt({ min: 1 }).withMessage('Valid mapping ID is required')],
  validate,
  async (req, res, next) => {
    try {
      const patientId = parseInt(req.params.patientId, 10);
      const mappingId = parseInt(req.params.mappingId, 10);

      const mapping = await prisma.patientDoctorMapping.findFirst({
        where: {
          id: mappingId,
          patientId
        },
        include: {
          doctor: true
        }
      });

      if (!mapping) {
        return res.status(404).json({ error: 'Mapping not found' });
      }

      return res.status(200).json(mapping);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:mappingId',
  verifyPatientOwnership,
  [param('mappingId').isInt({ min: 1 }).withMessage('Valid mapping ID is required')],
  validate,
  async (req, res, next) => {
    try {
      const patientId = parseInt(req.params.patientId, 10);
      const mappingId = parseInt(req.params.mappingId, 10);

      const mapping = await prisma.patientDoctorMapping.findFirst({
        where: {
          id: mappingId,
          patientId
        }
      });

      if (!mapping) {
        return res.status(404).json({ error: 'Mapping not found' });
      }

      await prisma.patientDoctorMapping.delete({
        where: { id: mappingId }
      });

      return res.status(200).json({ message: 'Mapping deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
