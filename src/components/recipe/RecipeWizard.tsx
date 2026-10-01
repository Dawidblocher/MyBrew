import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { FieldPath } from "react-hook-form";
import { FormProvider } from "react-hook-form";
import { z } from "zod";
import { X } from "lucide-react";
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
import { WizardStepNav, type WizardStepConfig } from "@/components/recipe/WizardStepNav";
import { WizardFooter } from "@/components/recipe/WizardFooter";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { RecipeDraft } from "@/types";

const WIZARD_STEPS: WizardStepConfig[] = [
  { id: "basics", label: "Podstawy", hint: "Nazwa i styl" },
  { id: "grist", label: "Zasyp i parametry", hint: "Słody i objętość" },
  { id: "mash", label: "Zacieranie", hint: "Przerwy i wydajność" },
  { id: "hops", label: "Chmiel", hint: "Chmielenie i IBU" },
  { id: "yeast", label: "Drożdże", hint: "Szczep i fermentacja" },
  { id: "adjuncts", label: "Dodatki", hint: "Przyprawy, owoce, inne" },
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

interface RecipeWizardProps {
  recipeId?: string;
  initialData?: RecipeDraft;
}

export default function RecipeWizard({ recipeId, initialData }: RecipeWizardProps = {}) {
  const { form } = useWizardRecipe(initialData);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<SaveValidationError[]>([]);
  const [genericSaveError, setGenericSaveError] = useState<string | null>(null);

  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const skipHeadingFocusRef = useRef(false);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    if (skipHeadingFocusRef.current) {
      skipHeadingFocusRef.current = false;
      return;
    }
    stepHeadingRef.current?.focus();
  }, [currentStep]);

  const StepComponent = STEP_COMPONENTS[currentStep] ?? BasicsStep;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const isEdit = Boolean(recipeId);
  const cancelHref = isEdit ? `/recipes/${recipeId}` : "/recipes";

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

    skipHeadingFocusRef.current = focused;
    const firstStep = errors.reduce((min, err) => Math.min(min, stepForField(err.field)), WIZARD_STEPS.length - 1);
    setCurrentStep(firstStep);
  }

  function handleStepSelect(index: number) {
    if (index < currentStep) {
      setCurrentStep(index);
    }
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
      const isEditSave = Boolean(recipeId);
      const response = await fetch(isEditSave ? `/api/recipes/${recipeId}` : "/api/recipes", {
        method: isEditSave ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (response.status === 201 || response.status === 200) {
        window.location.href = isEditSave ? `/recipes/${recipeId}` : "/recipes";
        return;
      }

      if (response.status === 401) {
        window.location.href = "/auth/signin";
        return;
      }

      if (response.status === 404) {
        window.location.href = "/recipes";
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

  function handleCancelClick(event: MouseEvent<HTMLAnchorElement>) {
    if (form.formState.isDirty && !window.confirm("Porzucić niezapisane zmiany?")) {
      event.preventDefault();
    }
  }

  const progressPercent = ((currentStep + 1) / WIZARD_STEPS.length) * 100;
  const wizardTitle = isEdit ? "Edytuj przepis" : "Nowy przepis";
  const wizardEyebrow = isEdit ? "Edycja przepisu" : "Nowy przepis";

  return (
    <div className="grid min-h-dvh lg:grid-cols-[260px_1fr]">
      <aside className="border-rule bg-paper-2 hidden flex-col gap-5 border-r px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:overflow-y-auto">
        <h1 className="text-ink font-serif text-[20px] font-medium tracking-[-0.02em]">{wizardTitle}</h1>
        <WizardStepNav steps={WIZARD_STEPS} currentIndex={currentStep} onSelect={handleStepSelect} />
      </aside>

      <FormProvider {...form}>
        <div className="flex min-h-dvh min-w-0 flex-col">
          <header className="border-rule flex items-start justify-between gap-4 border-b px-4 py-5 sm:px-8">
            <div className="min-w-0">
              <Eyebrow>{wizardEyebrow}</Eyebrow>
              <p className="text-ink-3 mt-0.5 font-mono text-xs tracking-[0.08em] uppercase">
                Krok {currentStep + 1} / {WIZARD_STEPS.length}
              </p>
              <h2
                ref={stepHeadingRef}
                tabIndex={-1}
                className="text-ink font-serif text-xl font-medium tracking-[-0.02em] outline-none sm:text-2xl"
              >
                {WIZARD_STEPS[currentStep].label}
              </h2>
            </div>
            <a
              href={cancelHref}
              onClick={handleCancelClick}
              aria-label="Zamknij kreator"
              className="text-ink-3 hover:bg-paper-3 hover:text-ink shrink-0 rounded-md p-2 transition-colors"
            >
              <X className="size-5" aria-hidden="true" />
            </a>
          </header>

          <div aria-hidden="true" className="bg-paper-3 h-0.5">
            <div
              className="bg-copper h-full transition-[width] duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <MetricsPanel variant="strip" />

          <div className="flex-1 px-4 py-6 sm:px-8">
            <div className="mx-auto max-w-[880px]">
              <StepComponent />
            </div>
          </div>

          <WizardFooter
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            isSaving={isSaving}
            onBack={handleBack}
            onNext={handleNext}
            onSave={handleSave}
            cancelHref={cancelHref}
            onCancel={handleCancelClick}
            saveErrors={saveErrors}
            genericSaveError={genericSaveError}
          />
        </div>
      </FormProvider>
    </div>
  );
}
