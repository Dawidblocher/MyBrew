import { useState } from "react";
import type { FieldPath } from "react-hook-form";
import { FormProvider } from "react-hook-form";
import { z } from "zod";
import { useWizardRecipe } from "@/components/hooks/useWizardRecipe";
import { gristStepSchema, hopsStepSchema, mashStepSchema } from "@/lib/recipe-schema";
import { buildRecipeInsert, type SaveValidationError } from "@/lib/recipe-save";
import { validateWizardStep } from "@/lib/wizard-step-validation";
import { BasicsStep } from "@/components/recipe/steps/BasicsStep";
import { GristStep } from "@/components/recipe/steps/GristStep";
import { MashStep } from "@/components/recipe/steps/MashStep";
import { HopsStep } from "@/components/recipe/steps/HopsStep";
import { YeastStep } from "@/components/recipe/steps/YeastStep";
import { AdjunctsStep } from "@/components/recipe/steps/AdjunctsStep";
import { MetricsPanel } from "@/components/recipe/MetricsPanel";
import { WizardStepper, type WizardStepConfig } from "@/components/recipe/WizardStepper";
import type { RecipeDraft } from "@/types";

const WIZARD_STEPS: WizardStepConfig[] = [
  { id: "basics", label: "Podstawy" },
  { id: "grist", label: "Zasyp i parametry" },
  { id: "mash", label: "Zacieranie" },
  { id: "hops", label: "Chmiel" },
  { id: "yeast", label: "Drożdże" },
  { id: "adjuncts", label: "Dodatki" },
];

const STEP_COMPONENTS = [BasicsStep, GristStep, MashStep, HopsStep, YeastStep, AdjunctsStep];

const basicsStyleSchema = z.string().trim().min(1, "Styl jest wymagany");

function stepForField(field: string): number {
  if (field.startsWith("basics")) return 0;
  if (field.startsWith("batch") || field.startsWith("malts") || field.startsWith("metrics.blg")) return 1;
  if (field.startsWith("mash") || field.startsWith("metrics.srm")) return 2;
  if (field.startsWith("hops") || field.startsWith("metrics.ibu")) return 3;
  if (field.startsWith("yeast") || field.startsWith("metrics.abv")) return 4;
  if (field.startsWith("adjuncts")) return 5;
  return 5;
}

function isFormFieldPath(field: string): field is FieldPath<RecipeDraft> {
  return !field.startsWith("metrics.");
}

export default function RecipeWizard() {
  const { form } = useWizardRecipe();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<SaveValidationError[]>([]);
  const [genericSaveError, setGenericSaveError] = useState<string | null>(null);

  const StepComponent = STEP_COMPONENTS[currentStep] ?? BasicsStep;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  function applySaveErrors(errors: SaveValidationError[]) {
    setSaveErrors(errors);
    setGenericSaveError(null);

    let focused = false;
    for (const { field, message } of errors) {
      if (isFormFieldPath(field)) {
        form.setError(field, { type: "manual", message }, { shouldFocus: !focused });
        focused = true;
      }
    }

    const firstStep = errors.reduce((min, err) => Math.min(min, stepForField(err.field)), WIZARD_STEPS.length - 1);
    setCurrentStep(firstStep);
  }

  async function handleNext() {
    if (currentStep === 0) {
      const nameValid = await form.trigger("basics.name");
      const styleResult = basicsStyleSchema.safeParse(form.getValues("basics.style"));
      if (!styleResult.success) {
        form.setError("basics.style", { message: styleResult.error.issues[0]?.message ?? "Styl jest wymagany" });
        return;
      }
      form.clearErrors("basics.style");
      if (!nameValid) return;
    } else if (currentStep === 1) {
      const valid = validateWizardStep(
        gristStepSchema,
        { batch: form.getValues("batch"), malts: form.getValues("malts") },
        form,
        ["batch.volumeL"],
      );
      if (!valid) return;
    } else if (currentStep === 2) {
      const valid = validateWizardStep(mashStepSchema, { mash: form.getValues("mash") }, form, ["mash.efficiencyPct"]);
      if (!valid) return;
    } else if (currentStep === 3) {
      const valid = validateWizardStep(hopsStepSchema, { hops: form.getValues("hops") }, form, []);
      if (!valid) return;
    }

    if (!isLastStep) {
      setCurrentStep((step) => step + 1);
    }
  }

  function handleBack() {
    if (!isFirstStep) {
      setCurrentStep((step) => step - 1);
    }
  }

  async function handleSave() {
    setSaveErrors([]);
    setGenericSaveError(null);

    const draft = form.getValues();
    const gate = buildRecipeInsert(draft, "");
    if (!gate.ok) {
      applySaveErrors(gate.errors);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (response.status === 201) {
        window.location.href = "/recipes";
        return;
      }

      if (response.status === 401) {
        window.location.href = "/auth/signin";
        return;
      }

      if (response.status === 400) {
        const payload = (await response.json()) as { errors?: SaveValidationError[] };
        if (payload.errors?.length) {
          applySaveErrors(payload.errors);
        } else {
          setGenericSaveError("Nie udało się zapisać przepisu. Sprawdź dane i spróbuj ponownie.");
        }
        return;
      }

      setGenericSaveError("Wystąpił błąd serwera. Spróbuj ponownie później.");
    } catch {
      setGenericSaveError("Nie udało się połączyć z serwerem. Spróbuj ponownie.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-8 text-white backdrop-blur-xl">
      <h1 className="mb-6 bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-2xl font-bold text-transparent">
        Nowy przepis
      </h1>

      <FormProvider {...form}>
        <WizardStepper
          steps={WIZARD_STEPS}
          currentIndex={currentStep}
          onBack={handleBack}
          onNext={handleNext}
          onSave={handleSave}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          isSaving={isSaving}
        >
          <StepComponent />
        </WizardStepper>

        {(saveErrors.length > 0 || genericSaveError) && (
          <div className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
            {genericSaveError ? (
              <p>{genericSaveError}</p>
            ) : (
              <ul className="list-inside list-disc space-y-1">
                {saveErrors.map((err) => (
                  <li key={`${err.field}-${err.message}`}>{err.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <MetricsPanel />
      </FormProvider>
    </div>
  );
}
