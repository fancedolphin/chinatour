/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ENV: string;
  readonly VITE_LOCALE: 'zh' | 'en';
  readonly VITE_SITE_TITLE: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_AMAP_API_KEY: string;
  readonly VITE_AMAP_SECURITY_CODE: string;
  readonly VITE_GOOGLE_MAP_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
