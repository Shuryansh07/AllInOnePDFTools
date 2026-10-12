import { AppError, ERROR_CODES } from "@/lib/errors/app-error";
import { handlePdfJob, pdfResponse } from "@/lib/server/pdf-job";
import { protectPdf } from "@/lib/server/qpdf";

export async function POST(request: Request) {
  return handlePdfJob(request, "protect", async ({ bytes, form }) => {
    const password = form.get("password");
    if (typeof password !== "string" || password.length === 0) {
      throw new AppError(ERROR_CODES.PASSWORD_REQUIRED);
    }

    return pdfResponse(await protectPdf(bytes, password));
  });
}
