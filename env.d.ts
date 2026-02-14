import type { EmailService } from "./src/shared/types";

declare global {
  interface Env {
    DB: D1Database;
    R2_BUCKET: R2Bucket;
    EMAILS: EmailService;
    MOCHA_USERS_SERVICE_API_URL: string;
    MOCHA_USERS_SERVICE_API_KEY: string;
  }
}

export {};
