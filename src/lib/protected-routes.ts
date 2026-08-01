const PROTECTED_ROUTES = ["/dashboard", "/recipes"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}
