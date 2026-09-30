import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { validacion } from "../datos/errores";

const KEY_LEN = 64;
const TOKEN_BYTES = 32;

export function normalizarEmail(email: string) {
  const limpio = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) validacion("Email invalido");
  return limpio;
}

export function validarPassword(password: string) {
  if (password.length < 10) validacion("La contrasena debe tener al menos 10 caracteres");
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    validacion("La contrasena debe combinar mayusculas, minusculas y numeros");
  }
}

export function crearPasswordHash(password: string) {
  validarPassword(password);
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verificarPassword(password: string, passwordHash: string) {
  const [algoritmo, salt, hash] = passwordHash.split(":");
  if (algoritmo !== "scrypt" || !salt || !hash) return false;
  const esperado = Buffer.from(hash, "hex");
  const calculado = scryptSync(password, salt, KEY_LEN);
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}

export function crearTokenSeguro() {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function expiraEn(minutos: number, ahora = new Date()) {
  return new Date(ahora.getTime() + minutos * 60_000);
}
