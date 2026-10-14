interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_CRAZYGAMES_LAUNCH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}
declare module "*.png" {
  const src: string;
  export default src;
}
