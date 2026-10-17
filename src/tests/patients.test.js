if (typeof describe === 'undefined') {
  const path = require('path');
  const { spawnSync } = require('child_process');
  const testFile = path.basename(__filename);
  const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['jest', testFile, '--runInBand', '--forceExit'],
    { stdio: 'inherit', shell: true }
  );
  process.exit(result.status || 0);
}

const request = require('supertest');
const app = require('../app');
const prisma = require('../prisma');

describe('Patients Endpoints (/api/patients)', () => {
  let token;
  let createdPatientId;
  const userCredentials = {
    name: 'Patient Tester',
    email: 'patientuser@example.com',
    password: 'Password123'
  };

  beforeAll(async () => {
    await prisma.patientDoctorMapping.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.user.deleteMany({ where: { email: userCredentials.email } });

    await request(app).post('/api/auth/register').send(userCredentials);
    const loginRes = await request(app).post('/api/auth/login').send({
      email: userCredentials.email,
      password: userCredentials.password
    });
    token = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.patientDoctorMapping.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.user.deleteMany({ where: { email: userCredentials.email } });
    await prisma.$disconnect();
  });

  test('should create a new patient for authenticated user', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Alice',
        lastName: 'Smith',
        birthDate: '1990-01-01'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.firstName).toBe('Alice');
    expect(res.body.lastName).toBe('Smith');
    createdPatientId = res.body.id;
  });

  test('should list all patients belonging to the authenticated user', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const patient = res.body.find((p) => p.id === createdPatientId);
    expect(patient).toBeDefined();
  });

  test('should retrieve a specific patient owned by the user', async () => {
    const res = await request(app)
      .get(`/api/patients/${createdPatientId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdPatientId);
    expect(res.body.firstName).toBe('Alice');
  });

  test('should replace patient data using PUT', async () => {
    const res = await request(app)
      .put(`/api/patients/${createdPatientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Alice',
        lastName: 'Smith',
        birthDate: '1990-01-01'
      });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdPatientId);
    expect(res.body.firstName).toBe('Alice');
    expect(res.body.lastName).toBe('Smith');
  });

  test('should partially update patient fields using PATCH', async () => {
    const res = await request(app)
      .patch(`/api/patients/${createdPatientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        lastName: 'Johnson'
      });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdPatientId);
    expect(res.body.lastName).toBe('Johnson');
    expect(res.body.firstName).toBe('Alice');
  });

  test('should delete a patient owned by the user', async () => {
    const res = await request(app)
      .delete(`/api/patients/${createdPatientId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');

    const getRes = await request(app)
      .get(`/api/patients/${createdPatientId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });
});
