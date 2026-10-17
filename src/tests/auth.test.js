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

describe('Authentication Endpoints (/api/auth)', () => {
  const testUser = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'Secret123'
  };

  beforeAll(async () => {
    await prisma.patientDoctorMapping.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.user.deleteMany({ where: { email: testUser.email } });
  });

  afterAll(async () => {
    await prisma.patientDoctorMapping.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await prisma.$disconnect();
  });

  test('should register a new user successfully and accept optional name without persisting it', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user).not.toHaveProperty('name');

    const dbUser = await prisma.user.findUnique({
      where: { email: testUser.email.toLowerCase() }
    });
    expect(dbUser).toBeDefined();
    expect(dbUser.name).toBeUndefined();
  });

  test('should return 409 Conflict if email is already registered', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/already registered/i);
  });

  test('should return 400 Bad Request if registration input is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'invalid-email-format',
        password: '123'
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  test('should login successfully and return access and refresh tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
  });

  test('should return 401 Unauthorized for invalid login credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword999'
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('should refresh access token when provided a valid refresh token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    const { refreshToken } = loginRes.body;

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(typeof res.body.accessToken).toBe('string');
  });

  test('should return 401 Unauthorized when refresh token is invalid or expired', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid.refresh.token' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toBe('Invalid or expired refresh token');
  });
});
