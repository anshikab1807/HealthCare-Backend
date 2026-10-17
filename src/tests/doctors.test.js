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

describe('Doctors Endpoints (/api/doctors)', () => {
  let token;
  let createdDoctorId;
  const userCredentials = {
    name: 'Doctor Tester',
    email: 'doctoruser@example.com',
    password: 'Password123'
  };

  beforeAll(async () => {
    await prisma.patientDoctorMapping.deleteMany();
    await prisma.doctor.deleteMany();
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
    await prisma.doctor.deleteMany();
    await prisma.user.deleteMany({ where: { email: userCredentials.email } });
    await prisma.$disconnect();
  });

  test('should create a doctor', async () => {
    const res = await request(app)
      .post('/api/doctors')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Dr. Jane',
        lastName: 'Doe',
        specialty: 'Cardiology'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.firstName).toBe('Dr. Jane');
    expect(res.body.lastName).toBe('Doe');
    expect(res.body.specialty).toBe('Cardiology');
    createdDoctorId = res.body.id;
  });

  test('should list all doctors', async () => {
    const res = await request(app)
      .get('/api/doctors')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const doctor = res.body.find((d) => d.id === createdDoctorId);
    expect(doctor).toBeDefined();
  });

  test('should retrieve a specific doctor by id', async () => {
    const res = await request(app)
      .get(`/api/doctors/${createdDoctorId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdDoctorId);
    expect(res.body.specialty).toBe('Cardiology');
  });

  test('should replace doctor data using PUT', async () => {
    const res = await request(app)
      .put(`/api/doctors/${createdDoctorId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Dr. Jane',
        lastName: 'Doe',
        specialty: 'Neurology'
      });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdDoctorId);
    expect(res.body.specialty).toBe('Neurology');
  });

  test('should partially update doctor fields using PATCH', async () => {
    const res = await request(app)
      .patch(`/api/doctors/${createdDoctorId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        specialty: 'Oncology'
      });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdDoctorId);
    expect(res.body.specialty).toBe('Oncology');
    expect(res.body.firstName).toBe('Dr. Jane');
  });

  test('should delete a doctor', async () => {
    const res = await request(app)
      .delete(`/api/doctors/${createdDoctorId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');

    const getRes = await request(app)
      .get(`/api/doctors/${createdDoctorId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });
});
