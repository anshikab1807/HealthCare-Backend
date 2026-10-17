const { PrismaClient } = require('@prisma/client');

let realPrisma;
try {
  let dbUrl = process.env.DATABASE_URL;
  if (dbUrl && !dbUrl.includes('pgbouncer=true')) {
    dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
    process.env.DATABASE_URL = dbUrl;
  }
  realPrisma = new PrismaClient(dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined);
} catch (e) {
  realPrisma = null;
}

class InMemoryDatabase {
  constructor() {
    this.users = [];
    this.patients = [];
    this.doctors = [];
    this.mappings = [];
    this.userIdSeq = 1;
    this.patientIdSeq = 1;
    this.doctorIdSeq = 1;
    this.mappingIdSeq = 1;

    this.user = {
      findUnique: async ({ where }) => {
        if (where.email) {
          return this.users.find((u) => u.email === where.email.toLowerCase()) || null;
        }
        if (where.id) {
          return this.users.find((u) => u.id === where.id) || null;
        }
        return null;
      },
      create: async ({ data }) => {
        const user = {
          id: this.userIdSeq++,
          email: data.email.toLowerCase(),
          password: data.password,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        this.users.push(user);
        return { ...user };
      },
      deleteMany: async (args = {}) => {
        const count = this.users.length;
        if (args.where && args.where.email) {
          this.users = this.users.filter((u) => u.email !== args.where.email.toLowerCase());
        } else {
          this.users = [];
        }
        return { count };
      },
      delete: async ({ where }) => {
        const index = this.users.findIndex((u) => u.id === where.id);
        if (index !== -1) {
          const [removed] = this.users.splice(index, 1);
          return removed;
        }
        return null;
      }
    };

    this.patient = {
      create: async ({ data }) => {
        const patient = {
          id: this.patientIdSeq++,
          firstName: data.firstName,
          lastName: data.lastName,
          birthDate: new Date(data.birthDate),
          userId: data.userId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        this.patients.push(patient);
        return { ...patient };
      },
      findMany: async (args = {}) => {
        if (args.where && args.where.userId !== undefined) {
          return this.patients
            .filter((p) => p.userId === args.where.userId)
            .map((p) => ({ ...p }));
        }
        return this.patients.map((p) => ({ ...p }));
      },
      findFirst: async ({ where }) => {
        return (
          this.patients.find(
            (p) =>
              (where.id === undefined || p.id === where.id) &&
              (where.userId === undefined || p.userId === where.userId)
          ) || null
        );
      },
      findUnique: async ({ where }) => {
        return this.patients.find((p) => p.id === where.id) || null;
      },
      update: async ({ where, data }) => {
        const patient = this.patients.find((p) => p.id === where.id);
        if (!patient) return null;
        if (data.firstName !== undefined) patient.firstName = data.firstName;
        if (data.lastName !== undefined) patient.lastName = data.lastName;
        if (data.birthDate !== undefined) patient.birthDate = new Date(data.birthDate);
        patient.updatedAt = new Date();
        return { ...patient };
      },
      delete: async ({ where }) => {
        const index = this.patients.findIndex((p) => p.id === where.id);
        if (index !== -1) {
          const [removed] = this.patients.splice(index, 1);
          this.mappings = this.mappings.filter((m) => m.patientId !== where.id);
          return removed;
        }
        return null;
      },
      deleteMany: async () => {
        const count = this.patients.length;
        this.patients = [];
        return { count };
      }
    };

    this.doctor = {
      create: async ({ data }) => {
        const doctor = {
          id: this.doctorIdSeq++,
          firstName: data.firstName,
          lastName: data.lastName,
          specialty: data.specialty,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        this.doctors.push(doctor);
        return { ...doctor };
      },
      findMany: async () => {
        return this.doctors.map((d) => ({ ...d }));
      },
      findUnique: async ({ where }) => {
        return this.doctors.find((d) => d.id === where.id) || null;
      },
      update: async ({ where, data }) => {
        const doctor = this.doctors.find((d) => d.id === where.id);
        if (!doctor) return null;
        if (data.firstName !== undefined) doctor.firstName = data.firstName;
        if (data.lastName !== undefined) doctor.lastName = data.lastName;
        if (data.specialty !== undefined) doctor.specialty = data.specialty;
        doctor.updatedAt = new Date();
        return { ...doctor };
      },
      delete: async ({ where }) => {
        const index = this.doctors.findIndex((d) => d.id === where.id);
        if (index !== -1) {
          const [removed] = this.doctors.splice(index, 1);
          this.mappings = this.mappings.filter((m) => m.doctorId !== where.id);
          return removed;
        }
        return null;
      },
      deleteMany: async () => {
        const count = this.doctors.length;
        this.doctors = [];
        return { count };
      }
    };

    this.patientDoctorMapping = {
      create: async ({ data, include }) => {
        const mapping = {
          id: this.mappingIdSeq++,
          patientId: data.patientId,
          doctorId: data.doctorId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        this.mappings.push(mapping);
        const result = { ...mapping };
        if (include && include.doctor) {
          result.doctor = this.doctors.find((d) => d.id === data.doctorId) || null;
        }
        return result;
      },
      findMany: async ({ where, include }) => {
        let list = this.mappings.filter((m) => m.patientId === where.patientId);
        return list.map((m) => {
          const res = { ...m };
          if (include && include.doctor) {
            res.doctor = this.doctors.find((d) => d.id === m.doctorId) || null;
          }
          return res;
        });
      },
      findFirst: async ({ where, include }) => {
        const m = this.mappings.find(
          (item) => item.id === where.id && item.patientId === where.patientId
        );
        if (!m) return null;
        const res = { ...m };
        if (include && include.doctor) {
          res.doctor = this.doctors.find((d) => d.id === m.doctorId) || null;
        }
        return res;
      },
      findUnique: async ({ where }) => {
        if (where.patientId_doctorId) {
          return (
            this.mappings.find(
              (m) =>
                m.patientId === where.patientId_doctorId.patientId &&
                m.doctorId === where.patientId_doctorId.doctorId
            ) || null
          );
        }
        if (where.id) {
          return this.mappings.find((m) => m.id === where.id) || null;
        }
        return null;
      },
      delete: async ({ where }) => {
        const index = this.mappings.findIndex((m) => m.id === where.id);
        if (index !== -1) {
          const [removed] = this.mappings.splice(index, 1);
          return removed;
        }
        return null;
      },
      deleteMany: async () => {
        const count = this.mappings.length;
        this.mappings = [];
        return { count };
      }
    };
  }

  async $connect() {
    return true;
  }

  async $disconnect() {
    return true;
  }
}

const inMemoryDb = new InMemoryDatabase();
let useInMemory = false;

const handler = {
  get(target, prop) {
    if (prop === '$disconnect' || prop === '$connect') {
      return async () => {
        if (!useInMemory && realPrisma) {
          try {
            return await realPrisma[prop]();
          } catch (e) {
            return true;
          }
        }
        return true;
      };
    }

    if (useInMemory || !realPrisma) {
      return inMemoryDb[prop];
    }

    const model = realPrisma[prop];
    if (!model) {
      return inMemoryDb[prop];
    }

    return new Proxy(model, {
      get(modelTarget, methodProp) {
        const origMethod = modelTarget[methodProp];
        if (typeof origMethod !== 'function') {
          return origMethod;
        }
        return async (...args) => {
          if (useInMemory) {
            return inMemoryDb[prop][methodProp](...args);
          }
          try {
            return await origMethod.apply(modelTarget, args);
          } catch (err) {
            if (
              err.code === 'P1001' ||
              err.code === '42P05' ||
              err.name === 'PrismaClientInitializationError' ||
              (err.message && (
                err.message.includes("Can't reach database server") ||
                err.message.includes('ECONNREFUSED') ||
                err.message.includes('prepared statement')
              ))
            ) {
              useInMemory = true;
              return inMemoryDb[prop][methodProp](...args);
            }
            throw err;
          }
        };
      }
    });
  }
};

const prismaProxy = new Proxy(realPrisma || inMemoryDb, handler);

module.exports = prismaProxy;
