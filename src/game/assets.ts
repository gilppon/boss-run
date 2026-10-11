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

export interface GameSprites {
  bossDemon: HTMLImageElement | null;
  bossHellKing: HTMLImageElement | null;
  bossAbyssLord: HTMLImageElement | null;
  bossLastEmperor: HTMLImageElement | null;
  heroApprentice: HTMLImageElement | null;
  heroScout: HTMLImageElement | null;
  heroWarden: HTMLImageElement | null;
  heroBreaker: HTMLImageElement | null;
  heroDuelist: HTMLImageElement | null;
  minionImp: HTMLImageElement | null;
  tileGround: HTMLImageElement | null;
  pillarsHd: HTMLImageElement | null;
}

let cachedSprites: Promise<GameSprites> | null = null;

export function loadSprites(): Promise<GameSprites> {
  if (!cachedSprites) {
    cachedSprites = Promise.all([
      loadImage("./sprites/boss_demon.webp"),
      loadImage("./sprites/boss_hell_king.webp"),
      loadImage("./sprites/boss_abyss_lord.webp"),
      loadImage("./sprites/boss_last_emperor.webp"),
      loadImage("./sprites/hero_apprentice.webp"),
      loadImage("./sprites/hero_scout.webp"),
      loadImage("./sprites/hero_warden.webp"),
      loadImage("./sprites/hero_breaker.webp"),
      loadImage("./sprites/hero_duelist.webp"),
      loadImage("./sprites/minion_imp.webp"),
      loadImage("./sprites/tile_ground.webp"),
      loadImage("./sprites/pillars_hd.webp"),
    ]).then(([bossDemon, bossHellKing, bossAbyssLord, bossLastEmperor, heroApprentice, heroScout, heroWarden, heroBreaker, heroDuelist, minionImp, tileGround, pillarsHd]) => ({
      bossDemon,
      bossHellKing,
      bossAbyssLord,
      bossLastEmperor,
      heroApprentice,
      heroScout,
      heroWarden,
      heroBreaker,
      heroDuelist,
      minionImp,
      tileGround,
      pillarsHd,
    }));
  }
  return cachedSprites;
}

