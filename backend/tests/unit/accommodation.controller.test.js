describe("Accommodation Controller Unit Tests", () => {

  // 🔹 Sample validation functions
  function validateRent(rent) {
    return rent > 0;
  }

  function validateTitle(title) {
    return typeof title === "string" && title.trim().length > 0;
  }

  function isValidLocation(location) {
    return (
      location &&
      location.type === "Point" &&
      Array.isArray(location.coordinates) &&
      location.coordinates.length === 2
    );
  }

  // ✅ RENT VALIDATION
  it("should validate rent correctly", () => {
    expect(validateRent(5000)).toBe(true);
    expect(validateRent(0)).toBe(false);
    expect(validateRent(-100)).toBe(false);
  });

  // ✅ TITLE VALIDATION
  it("should validate title correctly", () => {
    expect(validateTitle("Room")).toBe(true);
    expect(validateTitle("")).toBe(false);
    expect(validateTitle("   ")).toBe(false);
  });

  // ✅ LOCATION VALIDATION
  it("should validate location correctly", () => {
    const validLocation = {
      type: "Point",
      coordinates: [77.6, 12.9]
    };

    const invalidLocation = {
      type: "Point",
      coordinates: [77.6]
    };

    expect(isValidLocation(validLocation)).toBe(true);
    expect(isValidLocation(invalidLocation)).toBe(false);
  });

});