process.env.NODE_ENV = "test";

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;
const testPath = expect.getState().testPath || "";
const needsDatabase = testPath.includes("auth.test") || testPath.includes("admin.test");

beforeAll(async () => {
  process.env.JWT_SECRET = "testsecret";
  process.env.JWT_EXPIRES_IN = "1h";

  if (!needsDatabase) {
    return;
  }

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  if (mongoServer) {
    await mongoServer.stop();
  }
});
