import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

const PASSWORD_HASH_ROUNDS = 12;

// Birbirine benzeyen karakterler (0/O, 1/l/I) yok, e-postadan bakıp yazarken karışmasın.
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%*?";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

const pick = (alphabet: string) => alphabet[randomInt(alphabet.length)]!;

/** Şifre kurallarına uyan, kriptografik olarak rastgele geçici şifre üretir. */
export function generateTemporaryPassword(length = 14): string {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < length) {
    chars.push(pick(ALL));
  }
  // Fisher–Yates karıştırma: zorunlu karakterler hep başta kalmasın.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

export const passwordPolicySchema = z
  .string()
  .min(10, "Şifre en az 10 karakter olmalı.")
  .max(128, "Şifre en fazla 128 karakter olabilir.")
  .regex(/[a-zçğıöşü]/, "Şifre en az bir küçük harf içermeli.")
  .regex(/[A-ZÇĞİÖŞÜ]/, "Şifre en az bir büyük harf içermeli.")
  .regex(/\d/, "Şifre en az bir rakam içermeli.");

export const hashPassword = (password: string) => bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
