/**
 * Password hashing/verification. Implemented in infrastructure (scrypt); the hash
 * format is opaque to the domain/use-cases.
 */
export interface PasswordHasher {
  hash(plain: string): string;
  verify(plain: string, hash: string): boolean;
}
