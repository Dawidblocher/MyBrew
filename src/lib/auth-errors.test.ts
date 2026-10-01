import { describe, expect, it } from "vitest";

import { GENERIC_AUTH_ERROR, toPolishAuthError } from "@/lib/auth-errors";

describe("toPolishAuthError", () => {
  it.each([
    ["Invalid login credentials", "Nieprawidłowy e-mail lub hasło."],
    ["User already registered", "Konto z tym adresem e-mail już istnieje."],
    ["Email not confirmed", "Adres e-mail nie został jeszcze potwierdzony. Sprawdź skrzynkę."],
    ["Password should be at least 6 characters", "Hasło musi mieć co najmniej 6 znaków."],
    ["Password should be at least 6 characters.", "Hasło musi mieć co najmniej 6 znaków."],
    ["Unable to validate email address: invalid format", "Podaj poprawny adres e-mail."],
    ["Email rate limit exceeded", "Zbyt wiele prób. Spróbuj ponownie za chwilę."],
    ["Supabase is not configured", "Logowanie jest chwilowo niedostępne (brak konfiguracji Supabase)."],
  ])("maps %j", (message, expected) => {
    expect(toPolishAuthError(message)).toBe(expected);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(toPolishAuthError("  INVALID LOGIN CREDENTIALS ")).toBe("Nieprawidłowy e-mail lub hasło.");
  });

  it.each(["Database error saving new user", "", "something unexpected"])("falls back for %j", (message) => {
    expect(toPolishAuthError(message)).toBe(GENERIC_AUTH_ERROR);
  });
});
