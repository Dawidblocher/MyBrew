import { useState } from "react";
import { FormProvider } from "react-hook-form";
import { useWizardRecipe } from "@/components/hooks/useWizardRecipe";
import { gristStepSchema } from "@/lib/recipe-schema";
import { validateWizardStep } from "@/lib/wizard-step-validation";
import { BasicsStep } from "@/components/recipe/steps/BasicsStep";
import { GristStep } from "@/components/recipe/steps/GristStep";
import { WizardStepper, type WizardStepConfig } from "@/components/recipe/WizardStepper";

const WIZARD_STEPS: WizardStepConfig[] = [
  { id: "basics", label: "Podstawy" },
  { id: "grist", label: "Zasyp i parametry" },
];

const STEP_COMPONENTS = [BasicsStep, GristStep];

export default function RecipeWizard() {
  const { form } = useWizardRecipe();
  const [currentStep, setCurrentStep] = useState(0);

  const StepComponent = STEP_COMPONENTS[currentStep] ?? BasicsStep;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  async function handleNext() {
    if (currentStep === 0) {
      const valid = await form.trigger("basics.name");
      if (!valid) return;
    } else if (currentStep === 1) {
      const valid = validateWizardStep(
        gristStepSchema,
        { batch: form.getValues("batch"), malts: form.getValues("malts") },
        form,
        ["batch.volumeL"],
      );
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
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
        >
          <StepComponent />
        </WizardStepper>
      </FormProvider>
    </div>
  );
}
