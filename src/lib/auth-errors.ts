export const GENERIC_AUTH_ERROR = "Coś poszło nie tak. Spróbuj ponownie za chwilę.";

// Matched case-insensitively as a prefix: Supabase sometimes appends details (e.g. a trailing period or reason).
const AUTH_ERROR_TRANSLATIONS: readonly (readonly [string, string])[] = [
  ["invalid login credentials", "Nieprawidłowy e-mail lub hasło."],
  ["user already registered", "Konto z tym adresem e-mail już istnieje."],
  ["email not confirmed", "Adres e-mail nie został jeszcze potwierdzony. Sprawdź skrzynkę."],
  ["password should be at least", "Hasło musi mieć co najmniej 6 znaków."],
  ["unable to validate email address", "Podaj poprawny adres e-mail."],
  ["email rate limit exceeded", "Zbyt wiele prób. Spróbuj ponownie za chwilę."],
  ["supabase is not configured", "Logowanie jest chwilowo niedostępne (brak konfiguracji Supabase)."],
];

export function toPolishAuthError(message: string): string {
  const normalized = message.trim().toLowerCase();
  const match = AUTH_ERROR_TRANSLATIONS.find(([prefix]) => normalized.startsWith(prefix));
  return match ? match[1] : GENERIC_AUTH_ERROR;
}
