/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_APP_OPERATOR_NAME?: string;
  /** ข้อความช่วยเหลือบนหน้า login (ถ้าว่างใช้ admin@example.com) */
  readonly VITE_LOGIN_TRIAL_EMAIL?: string;
  readonly VITE_LOGIN_TRIAL_PASSWORD_HINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
