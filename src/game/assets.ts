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
  bossDemonAnimation: HTMLImageElement | null;
  bossHellKing: HTMLImageElement | null;
  bossHellKingAnimation: HTMLImageElement | null;
  bossAbyssLord: HTMLImageElement | null;
  bossAbyssLordAnimation: HTMLImageElement | null;
  bossLastEmperor: HTMLImageElement | null;
  bossLastEmperorAnimation: HTMLImageElement | null;
  heroApprentice: HTMLImageElement | null;
  heroApprenticeAnimation: HTMLImageElement | null;
  heroScout: HTMLImageElement | null;
  heroScoutAnimation: HTMLImageElement | null;
  heroWarden: HTMLImageElement | null;
  heroWardenAnimation: HTMLImageElement | null;
  heroBreaker: HTMLImageElement | null;
  heroBreakerAnimation: HTMLImageElement | null;
  heroDuelist: HTMLImageElement | null;
  heroDuelistAnimation: HTMLImageElement | null;
  minionImp: HTMLImageElement | null;
  tileGround: HTMLImageElement | null;
  pillarsHd: HTMLImageElement | null;
}

type SpriteField = keyof GameSprites;
interface CharacterSpritePair {
  imageField: SpriteField;
  animationField: SpriteField;
  fileStem: string;
}

const bossSprites: Record<string, CharacterSpritePair> = {
  "Lil' Demon": { imageField: "bossDemon", animationField: "bossDemonAnimation", fileStem: "boss_demon" },
  "Hell King": { imageField: "bossHellKing", animationField: "bossHellKingAnimation", fileStem: "boss_hell_king" },
  "Abyss Lord": { imageField: "bossAbyssLord", animationField: "bossAbyssLordAnimation", fileStem: "boss_abyss_lord" },
  "Last Emperor": { imageField: "bossLastEmperor", animationField: "bossLastEmperorAnimation", fileStem: "boss_last_emperor" },
};

const heroSprites: Record<string, CharacterSpritePair> = {
  apprentice: { imageField: "heroApprentice", animationField: "heroApprenticeAnimation", fileStem: "hero_apprentice" },
  "sewer-scout": { imageField: "heroScout", animationField: "heroScoutAnimation", fileStem: "hero_scout" },
  "ember-warden": { imageField: "heroWarden", animationField: "heroWardenAnimation", fileStem: "hero_warden" },
  "abyss-breaker": { imageField: "heroBreaker", animationField: "heroBreakerAnimation", fileStem: "hero_breaker" },
  "crown-duelist": { imageField: "heroDuelist", animationField: "heroDuelistAnimation", fileStem: "hero_duelist" },
};

const spriteImageCache = new Map<string, Promise<HTMLImageElement | null>>();
const cachedSprites = new Map<string, Promise<GameSprites>>();

function loadSpriteImage(fileName: string): Promise<HTMLImageElement | null> {
  const src = `./sprites/${fileName}`;
  let promise = spriteImageCache.get(src);
  if (!promise) {
    promise = loadImage(src);
    spriteImageCache.set(src, promise);
  }
  return promise;
}

/** Load only the selected hero and boss plus the shared scene sprites. */
export function loadSprites(heroId: string, bossName: string): Promise<GameSprites> {
  const hero = heroSprites[heroId] ?? heroSprites.apprentice;
  const boss = bossSprites[bossName] ?? bossSprites["Lil' Demon"];
  const cacheKey = `${hero.fileStem}:${boss.fileStem}`;
  let promise = cachedSprites.get(cacheKey);
  if (!promise) {
    promise = Promise.all([
      loadSpriteImage(`${hero.fileStem}.webp`),
      loadSpriteImage(`${hero.fileStem}_anim.webp`),
      loadSpriteImage(`${boss.fileStem}.webp`),
      loadSpriteImage(`${boss.fileStem}_anim.webp`),
      loadSpriteImage("minion_imp.webp"),
      loadSpriteImage("tile_ground.webp"),
      loadSpriteImage("pillars_hd.webp"),
    ]).then(([heroImage, heroAnimation, bossImage, bossAnimation, minionImp, tileGround, pillarsHd]) => {
      const sprites: GameSprites = {
        bossDemon: null,
        bossDemonAnimation: null,
        bossHellKing: null,
        bossHellKingAnimation: null,
        bossAbyssLord: null,
        bossAbyssLordAnimation: null,
        bossLastEmperor: null,
        bossLastEmperorAnimation: null,
        heroApprentice: null,
        heroApprenticeAnimation: null,
        heroScout: null,
        heroScoutAnimation: null,
        heroWarden: null,
        heroWardenAnimation: null,
        heroBreaker: null,
        heroBreakerAnimation: null,
        heroDuelist: null,
        heroDuelistAnimation: null,
        minionImp,
        tileGround,
        pillarsHd,
      };
      Object.assign(sprites, {
        [hero.imageField]: heroImage,
        [hero.animationField]: heroAnimation,
        [boss.imageField]: bossImage,
        [boss.animationField]: bossAnimation,
      });
      return sprites;
    });
    cachedSprites.set(cacheKey, promise);
  }
  return promise;
}

