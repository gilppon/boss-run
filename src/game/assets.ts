import bgUrl from "../assets/bg-castle.jpg";

export { bgUrl };

let cached: Promise<HTMLImageElement | null> | null = null;

/** Preload the castle backdrop (inlined as a data URI in the single-file build) */
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
