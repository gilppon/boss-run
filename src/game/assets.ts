export const bgUrl = "./bg-castle.webp";

const backdrops = [
  bgUrl,
  "./bg-sewers.webp",
  "./bg-ember-gallery.webp",
  "./bg-abyssal-halls.webp",
  "./bg-kings-cathedral.webp",
];
const cached = new Map<number, Promise<HTMLImageElement | null>>();

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Load only the selected floor backdrop; fall back to the original castle if it fails. */
export function loadBackdrop(floorIndex = 0): Promise<HTMLImageElement | null> {
  const index = Number.isInteger(floorIndex) && floorIndex >= 0 && floorIndex < backdrops.length ? floorIndex : 0;
  let promise = cached.get(index);
  if (!promise) {
    const src = backdrops[index] ?? bgUrl;
    promise = loadImage(src).then((img) => img ?? (index === 0 ? null : loadImage(bgUrl)));
    cached.set(index, promise);
  }
  return promise;
}
