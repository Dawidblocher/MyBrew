import { z } from "zod";
import type { RecipeDraft } from "@/types";

const maltEntrySchema = z.object({
  amountKg: z.coerce.number().positive("Ilość musi być większa od zera"),
  colorEbc: z.coerce.number().min(0, "Kolor EBC nie może być ujemny"),
  extractPercent: z.coerce
    .number()
    .min(0, "Ekstrakt nie może być ujemny")
    .max(100, "Ekstrakt nie może przekraczać 100%"),
});

export const recipeDraftSchema = z.object({
  basics: z.object({
    name: z.string().trim().min(1, "Nazwa jest wymagana"),
    style: z.string(),
  }),
  batch: z.object({
    /** Zero is allowed while the draft is in progress; grist step requires positive volume. */
    volumeL: z.coerce.number().min(0, "Objętość nie może być ujemna"),
  }),
  malts: z.array(maltEntrySchema),
});

export const basicsStepSchema = recipeDraftSchema.pick({ basics: true });

export const gristStepSchema = z.object({
  batch: z.object({
    volumeL: z.coerce.number().positive("Objętość musi być większa od zera"),
  }),
  malts: z.array(maltEntrySchema),
});

export type RecipeDraftForm = RecipeDraft;

export const defaultRecipeDraft: RecipeDraft = {
  basics: { name: "", style: "" },
  batch: { volumeL: 0 },
  malts: [],
};

export const defaultMaltEntry: RecipeDraft["malts"][number] = {
  amountKg: 0,
  colorEbc: 0,
  extractPercent: 0,
};
