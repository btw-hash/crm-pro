import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { PasswordHasher } from "@/application/ports/password-hasher";

const KEY_LEN = 64;

/**
 * Password hashing via scrypt (Node's standard library, no dependencies).
 * Storage format: `saltHex:keyHex`. Comparison is constant-time.
 */
export class ScryptPasswordHasher implements PasswordHasher {
  hash(plain: string): string {
    const salt = randomBytes(16);
    const key = scryptSync(plain, salt, KEY_LEN);
    return `${salt.toString("hex")}:${key.toString("hex")}`;
  }

  verify(plain: string, hash: string): boolean {
    const [saltHex, keyHex] = hash.split(":");
    if (!saltHex || !keyHex) {
      return false;
    }
    const key = Buffer.from(keyHex, "hex");
    const candidate = scryptSync(plain, Buffer.from(saltHex, "hex"), key.length);
    return key.length === candidate.length && timingSafeEqual(key, candidate);
  }
}
