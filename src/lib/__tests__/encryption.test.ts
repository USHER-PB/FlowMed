import { encrypt, decrypt } from "../encryption";

// Set up test environment variable
process.env.ENCRYPTION_KEY = "test-encryption-key-32-chars-ok!";

describe("Encryption utilities", () => {
  it("encrypts and decrypts a string correctly", () => {
    const plaintext = "Hello, World!";
    const ciphertext = encrypt(plaintext);
    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const plaintext = "same input";
    const cipher1 = encrypt(plaintext);
    const cipher2 = encrypt(plaintext);
    expect(cipher1).not.toBe(cipher2);
    // But both decrypt to the same value
    expect(decrypt(cipher1)).toBe(plaintext);
    expect(decrypt(cipher2)).toBe(plaintext);
  });

  it("encrypts sensitive medical data", () => {
    const diagnosis = "Patient has hypertension. Prescribe lisinopril 10mg.";
    const encrypted = encrypt(diagnosis);
    expect(encrypted).not.toContain(diagnosis);
    expect(decrypt(encrypted)).toBe(diagnosis);
  });

  it("throws on invalid ciphertext format", () => {
    expect(() => decrypt("invalid-format")).toThrow("Invalid ciphertext format");
  });

  it("handles unicode characters", () => {
    const text = "Diagnostic: fièvre et maux de tête";
    const encrypted = encrypt(text);
    expect(decrypt(encrypted)).toBe(text);
  });
});
