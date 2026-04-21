import { registerSchema, loginSchema } from "../validations/auth";

describe("Auth validation schemas", () => {
  describe("registerSchema", () => {
    it("accepts valid patient registration", () => {
      const result = registerSchema.safeParse({
        email: "patient@example.com",
        password: "SecurePass1",
        role: "PATIENT",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = registerSchema.safeParse({
        email: "not-an-email",
        password: "SecurePass1",
        role: "PATIENT",
      });
      expect(result.success).toBe(false);
    });

    it("rejects weak password (no uppercase)", () => {
      const result = registerSchema.safeParse({
        email: "user@example.com",
        password: "weakpass1",
        role: "PATIENT",
      });
      expect(result.success).toBe(false);
    });

    it("rejects weak password (no number)", () => {
      const result = registerSchema.safeParse({
        email: "user@example.com",
        password: "WeakPassword",
        role: "PATIENT",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid role", () => {
      const result = registerSchema.safeParse({
        email: "user@example.com",
        password: "SecurePass1",
        role: "INVALID_ROLE",
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid roles", () => {
      const roles = ["PATIENT", "PROVIDER", "MEDICAL_CENTER"] as const;
      roles.forEach((role) => {
        const result = registerSchema.safeParse({
          email: "user@example.com",
          password: "SecurePass1",
          role,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("loginSchema", () => {
    it("accepts valid login credentials", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "anypassword",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty password", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "",
      });
      expect(result.success).toBe(false);
    });
  });
});
