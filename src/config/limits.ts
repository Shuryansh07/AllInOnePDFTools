export const LIMITS = {
  /** Max size per file in bytes (50 MB). */
  maxFileSizeBytes: 50 * 1024 * 1024,
  maxFilesPerJob: 20,
} as const;

export const ACCEPTED_MIME = {
  pdf: ["application/pdf"],
  image: ["image/jpeg", "image/png"],
} as const;
