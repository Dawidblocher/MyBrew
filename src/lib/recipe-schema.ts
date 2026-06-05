import { z } from "zod";
import type { RecipeDraft } from "@/types";

const maltEntrySchema = z.object({
  name: z.string(),
  amountKg: z.coerce.number({ error: "Podaj ilość w kg" }).positive("Ilość musi być większa od zera"),
  colorEbc: z.coerce.number({ error: "Podaj kolor w EBC" }).min(0, "Kolor EBC nie może być ujemny"),
  extractPercent: z.coerce
    .number({ error: "Podaj ekstrakt w %" })
    .min(0, "Ekstrakt nie może być ujemny")
    .max(100, "Ekstrakt nie może przekraczać 100%"),
});

const mashRestSchema = z.object({
  tempC: z.coerce.number({ error: "Podaj temperaturę w °C" }).min(0, "Temperatura nie może być ujemna"),
  durationMin: z.coerce.number({ error: "Podaj czas w minutach" }).min(0, "Czas nie może być ujemny"),
});

const hopEntrySchema = z.object({
  name: z.string(),
  alphaAcidPercent: z.coerce
    .number({ error: "Podaj alfa-kwasy w %" })
    .min(0, "Alfa-kwasy nie mogą być ujemne")
    .max(100, "Alfa-kwasy nie mogą przekraczać 100%"),
  amountG: z.coerce.number({ error: "Podaj ilość w gramach" }).min(0, "Ilość nie może być ujemna"),
  stage: z.enum(["boil", "whirlpool", "dryHop"]),
  timeMin: z.coerce.number({ error: "Podaj czas w minutach" }).min(0, "Czas nie może być ujemny"),
});

export const recipeDraftSchema = z.object({
  basics: z.object({
    name: z.string().trim().min(1, "Nazwa jest wymagana"),
    style: z.string(),
  }),
  batch: z.object({
    /** Zero is allowed while the draft is in progress; grist step requires positive volume. */
    volumeL: z.coerce.number({ error: "Podaj objętość w litrach" }).min(0, "Objętość nie może być ujemna"),
  }),
  malts: z.array(maltEntrySchema),
  mash: z.object({
    /** Zero is allowed while the draft is in progress; mash step requires positive efficiency. */
    efficiencyPct: z.coerce
      .number({ error: "Podaj wydajność w %" })
      .min(0, "Wydajność nie może być ujemna")
      .max(100, "Wydajność nie może przekraczać 100%"),
    waterToGrainRatio: z.coerce
      .number({ error: "Podaj stosunek woda/słód" })
      .min(0, "Stosunek woda/słód nie może być ujemny"),
    rests: z.array(mashRestSchema),
  }),
  hops: z.array(hopEntrySchema),
});

export const gristStepSchema = z.object({
  batch: z.object({
    volumeL: z.coerce.number({ error: "Podaj objętość w litrach" }).positive("Objętość musi być większa od zera"),
  }),
  malts: z.array(maltEntrySchema),
});

export const mashStepSchema = z.object({
  mash: z.object({
    efficiencyPct: z.coerce.number({ error: "Podaj wydajność w %" }).positive("Wydajność musi być większa od zera"),
    waterToGrainRatio: z.coerce
      .number({ error: "Podaj stosunek woda/słód" })
      .min(0, "Stosunek woda/słód nie może być ujemny"),
    rests: z.array(mashRestSchema),
  }),
});

export const hopsStepSchema = z.object({
  hops: z.array(hopEntrySchema),
});

export type RecipeDraftForm = RecipeDraft;

export const defaultRecipeDraft: RecipeDraft = {
  basics: { name: "", style: "" },
  batch: { volumeL: 0 },
  malts: [],
  mash: { efficiencyPct: 75, waterToGrainRatio: 0, rests: [] },
  hops: [],
};

export const defaultMaltEntry: RecipeDraft["malts"][number] = {
  name: "",
  amountKg: 0,
  colorEbc: 0,
  extractPercent: 0,
};

export const defaultMashRest: RecipeDraft["mash"]["rests"][number] = {
  tempC: 0,
  durationMin: 0,
};

export const defaultHopEntry: RecipeDraft["hops"][number] = {
  name: "",
  alphaAcidPercent: 0,
  amountG: 0,
  stage: "boil",
  timeMin: 0,
};
