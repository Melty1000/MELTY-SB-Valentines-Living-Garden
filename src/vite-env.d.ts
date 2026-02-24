/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STREAMERBOT_HOST?: string;
  readonly VITE_STREAMERBOT_PORT?: string;
  readonly VITE_STREAMERBOT_ENDPOINT?: string;
  readonly VITE_STREAMERBOT_BROADCASTER_NAME?: string;
  readonly VITE_ENABLE_DEBUG_UI?: string;
  readonly VITE_ENABLE_DEBUG_GLOBALS?: string;
  readonly VITE_MAX_FPS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
