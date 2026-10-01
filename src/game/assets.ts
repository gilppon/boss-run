import bgUrl from "../assets/bg-castle.jpg";

export { bgUrl };

let cached: Promise<HTMLImageElement | null> | null = null;

/** 마왕성 배경 이미지를 미리 로드(단일 파일 빌드라 data URI로 인라인 됨) */
export function loadBackdrop(): Promise<HTMLImageElement | null> {
  if (!cached) {
    cached = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = bgUrl;
    });
  }
  return cached;
}
