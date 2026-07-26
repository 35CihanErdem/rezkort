import * as Crypto from 'expo-crypto';

export async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${password}`,
  );
}

export async function verifyPassword(
  password: string,
  salt: string,
  passwordHash: string,
): Promise<boolean> {
  const next = await hashPassword(password, salt);
  return next === passwordHash;
}
