import { AppError, ERROR_CODES } from "@/lib/errors/app-error";
import { compressPdf, isCompressionPreset } from "@/lib/server/ghostscript";
import { handlePdfJob, pdfResponse } from "@/lib/server/pdf-job";

export async function POST(request: Request) {
  return handlePdfJob(request, "compress", async ({ bytes, form }) => {
    const preset = form.get("preset") ?? "recommended";
    if (!isCompressionPreset(preset)) {
      throw new AppError(ERROR_CODES.INVALID_FILE_TYPE, {
        userMessage: "Choose a valid compression level.",
      });
    }

    const result = await compressPdf(bytes, preset);
    return pdfResponse(result.bytes, {
      "X-Compression-Result": result.unchanged ? "unchanged" : "reduced",
    });
  });
}
