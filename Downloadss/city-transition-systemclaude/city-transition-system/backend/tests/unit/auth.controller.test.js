const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

describe("Auth Controller Unit Tests", () => {

  const password = "123456";

  // ✅ PASSWORD HASHING
  it("should hash password correctly", async () => {
    const hash = await bcrypt.hash(password, 10);

    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(20);
  });

  // ✅ PASSWORD MATCH
  it("should compare password correctly", async () => {
    const hash = await bcrypt.hash(password, 10);

    const isMatch = await bcrypt.compare(password, hash);

    expect(isMatch).toBe(true);
  });

  // ❌ WRONG PASSWORD
  it("should fail for incorrect password", async () => {
    const hash = await bcrypt.hash(password, 10);

    const isMatch = await bcrypt.compare("wrong", hash);

    expect(isMatch).toBe(false);
  });

  // ✅ JWT TOKEN GENERATION
  it("should generate valid JWT token", () => {
    const token = jwt.sign({ id: "user123" }, "testsecret", {
      expiresIn: "1h"
    });

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
  });

  // ✅ JWT VERIFY
  it("should verify JWT token", () => {
    const token = jwt.sign({ id: "user123" }, "testsecret");

    const decoded = jwt.verify(token, "testsecret");

    expect(decoded.id).toBe("user123");
  });

});
