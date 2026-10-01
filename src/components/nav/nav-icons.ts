import { BookOpen, LogIn, Plus, UserPlus, type LucideIcon } from "lucide-react";

import type { NavIconKey } from "@/lib/nav-items";

export const NAV_ICONS: Record<NavIconKey, LucideIcon> = {
  recipes: BookOpen,
  "new-recipe": Plus,
  signin: LogIn,
  signup: UserPlus,
};
