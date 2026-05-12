describe("Role Logic Unit Tests", () => {

  function isAdmin(role) {
    return role === "admin";
  }

  it("should allow admin", () => {
    expect(isAdmin("admin")).toBe(true);
  });

  it("should reject non-admin", () => {
    expect(isAdmin("user")).toBe(false);
    expect(isAdmin("owner")).toBe(false);
  });

});