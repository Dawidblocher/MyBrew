import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buildRecipeJsonBlob, sanitizeFilename, triggerBlobDownload } from "@/lib/recipe-export";
import { cn } from "@/lib/utils";
import type { RecipeRecord } from "@/types";

const buttonClassName = "border-white/20 bg-white/10 text-white hover:bg-white/20";

export default function RecipeExportActions({ record }: { record: RecipeRecord }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const baseFilename = sanitizeFilename(record.name);

  function handleJsonDownload() {
    const blob = buildRecipeJsonBlob(record);
    triggerBlobDownload(blob, `${baseFilename}.json`);
  }

  async function handlePdfDownload() {
    setPdfLoading(true);
    setPdfError(null);
    try {
      const [{ pdf }, { RecipePdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/recipe/RecipePdf"),
      ]);
      const blob = await pdf(<RecipePdf record={record} />).toBlob();
      triggerBlobDownload(blob, `${baseFilename}.pdf`);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "Nie udało się wygenerować PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className={cn(buttonClassName)} onClick={handleJsonDownload}>
          Pobierz JSON
        </Button>
        <Button
          type="button"
          variant="outline"
          className={cn(buttonClassName)}
          onClick={handlePdfDownload}
          disabled={pdfLoading}
        >
          {pdfLoading ? "Generuję PDF…" : "Pobierz PDF"}
        </Button>
      </div>
      {pdfError ? <p className="text-sm text-red-300">{pdfError}</p> : null}
    </div>
  );
}
