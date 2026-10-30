export type HolidayId =
  | "christmas"
  | "halloween"
  | "newyear"
  | "valentine"
  | "easter"
  | "thanksgiving"
  | "lunarnewyear"
  | "stpatricks"
  | "earthday"
  | "cyberpunk"
  | "deepocean"
  | "cosmic"
  | "cozycoffee"
  | "enchantedforest"
  | "campfire";

export type ThemeCategory = "classic" | "nature" | "sci-fi" | "cozy" | "holiday";

export type ThemeViewMode = "timer" | "garden" | HolidayId;

export interface HolidayTheme {
  id: HolidayId;
  name: string;
  shortName: string;
  tagline: string;
  category?: ThemeCategory;
  accentColor: string;
  secondaryColor: string;
  startMonth?: number; // 1-12 (optional for non-holiday themes)
  startDay?: number;
  endMonth?: number;
  endDay?: number;
  stages: [string, string, string, string, string];
  completionTitle: string;
  requiredLevel: number;
}

export const THEME_REQUIRED_LEVELS: Record<string, number> = {
  // Classics & Starters
  timer: 1,
  auto: 1,
  halloween: 1,
  cozycoffee: 1,
  garden: 2,
  campfire: 2,
  // Intermediate Tiers
  thanksgiving: 3,
  christmas: 4,
  deepocean: 4,
  easter: 5,
  valentine: 6,
  enchantedforest: 6,
  stpatricks: 7,
  // Advanced Tiers
  lunarnewyear: 8,
  cyberpunk: 9,
  newyear: 10,
  cosmic: 11,
  earthday: 12,
};

export function getThemeRequiredLevel(themeId: string): number {
  return THEME_REQUIRED_LEVELS[themeId] ?? 1;
}

export function isThemeUnlocked(themeId: string, userLevel: number): boolean {
  return userLevel >= getThemeRequiredLevel(themeId);
}

export const HOLIDAY_THEMES: Record<HolidayId, HolidayTheme> = {
  halloween: {
    id: "halloween",
    name: "Spooky Fun & Treats",
    shortName: "Spooky Season",
    tagline: "Carve glowing pumpkins and friendly spirits",
    accentColor: "#f97316",
    secondaryColor: "#7c3aed",
    startMonth: 10,
    startDay: 15,
    endMonth: 11,
    endDay: 2,
    stages: [
      "Sprouting pumpkin in the patch",
      "Golden pumpkin growing round",
      "Carving the big happy grin",
      "Warm flickering candlelight",
      "Friendly ghost floating with cheer",
    ],
    completionTitle: "Spooky Celebration Complete!",
    requiredLevel: 1,
  },
  thanksgiving: {
    id: "thanksgiving",
    name: "Cozy Autumn Feast",
    shortName: "Autumn Harvest",
    tagline: "Fill the horn of plenty with sweet bounty",
    accentColor: "#d97706",
    secondaryColor: "#b45309",
    startMonth: 11,
    startDay: 10,
    endMonth: 11,
    endDay: 30,
    stages: [
      "Crisp breeze and swirling maple leaves",
      "Gathering golden sunlit wheat",
      "Harvesting orchard apples and pears",
      "Weaving the bountiful cornucopia",
      "Hearty feast of gratitude in full glow",
    ],
    completionTitle: "Warm Thanksgiving Abundance!",
    requiredLevel: 3,
  },
  christmas: {
    id: "christmas",
    name: "Jolly Holiday Magic",
    shortName: "Christmas Cheer",
    tagline: "Deck the evergreen with twinkling lights",
    accentColor: "#10b981",
    secondaryColor: "#ef4444",
    startMonth: 12,
    startDay: 1,
    endMonth: 12,
    endDay: 28,
    stages: [
      "Snowy evergreen pine sapling",
      "Lush winter boughs branching out",
      "Twinkling golden garland strings",
      "Decking colorful festive baubles",
      "Golden shining star and gift surprises",
    ],
    completionTitle: "Merry & Bright Holiday Wonder!",
    requiredLevel: 4,
  },
  newyear: {
    id: "newyear",
    name: "Midnight Spark & Cheer",
    shortName: "New Year Spark",
    tagline: "Ignite radiant fireworks into the night sky",
    accentColor: "#eab308",
    secondaryColor: "#6366f1",
    startMonth: 12,
    startDay: 29,
    endMonth: 1,
    endDay: 7,
    stages: [
      "City lights twinkling at dusk",
      "Countdown clock ticking closer",
      "Rockets soaring high into the clouds",
      "Sparkling starbursts popping in color",
      "Grand midnight celebration in full burst",
    ],
    completionTitle: "Happy New Year Festivities!",
    requiredLevel: 10,
  },
  lunarnewyear: {
    id: "lunarnewyear",
    name: "Golden Lantern Festival",
    shortName: "Lunar Festival",
    tagline: "Hang lucky red lanterns and welcome prosperity",
    accentColor: "#dc2626",
    secondaryColor: "#eab308",
    startMonth: 1,
    startDay: 18,
    endMonth: 2,
    endDay: 15,
    stages: [
      "Festival arches painted bright crimson",
      "Hanging swinging lucky silk lanterns",
      "Sweet plum flowers blossoming",
      "Prosperity coins glistening with luck",
      "Joyous festival celebration in full glow",
    ],
    completionTitle: "Abundant Luck & Good Fortune!",
    requiredLevel: 8,
  },
  valentine: {
    id: "valentine",
    name: "Warm Hearts & Roses",
    shortName: "Sweetheart Bloom",
    tagline: "Nurture a charming bouquet of affection",
    accentColor: "#ec4899",
    secondaryColor: "#f43f5e",
    startMonth: 2,
    startDay: 7,
    endMonth: 2,
    endDay: 18,
    stages: [
      "Tender green rose stem sprouting",
      "Soft petals unfurling gently",
      "Charming garden bouquet blooming",
      "Origami paper hearts taking flight",
      "Radiant glow of warmth and harmony",
    ],
    completionTitle: "Pure Love & Heartfelt Smiles!",
    requiredLevel: 6,
  },
  stpatricks: {
    id: "stpatricks",
    name: "Lucky Clover & Rainbows",
    shortName: "Lucky Shamrocks",
    tagline: "Find the four-leaf clover and pot of gold",
    accentColor: "#22c55e",
    secondaryColor: "#eab308",
    startMonth: 3,
    startDay: 10,
    endMonth: 3,
    endDay: 20,
    stages: [
      "Fresh emerald sprouts in the morning mist",
      "Playful meadow of three-leaf clovers",
      "Rare four-leaf lucky charm discovered",
      "Vibrant seven-color rainbow arching high",
      "Pot of glistening gold at the rainbow's end",
    ],
    completionTitle: "Golden Luck of the Emerald Isle!",
    requiredLevel: 7,
  },
  easter: {
    id: "easter",
    name: "Springtime Meadow Hop",
    shortName: "Springtime Hop",
    tagline: "Discover painted eggs and playful bunnies",
    accentColor: "#a855f7",
    secondaryColor: "#38bdf8",
    startMonth: 3,
    startDay: 25,
    endMonth: 4,
    endDay: 20,
    stages: [
      "Fresh green grass sprinkled with morning dew",
      "Handwoven pastel egg basket appears",
      "Painting bright striped and polka-dot eggs",
      "Playful bunny ears peeking over the rim",
      "Meadow butterflies dancing in the spring air",
    ],
    completionTitle: "Joyous Springtime Sunshine!",
    requiredLevel: 5,
  },
  earthday: {
    id: "earthday",
    name: "Living Blue Wonder",
    shortName: "Earth Wonder",
    tagline: "Watch our vibrant home planet flourish",
    accentColor: "#06b6d4",
    secondaryColor: "#10b981",
    startMonth: 4,
    startDay: 20,
    endMonth: 4,
    endDay: 30,
    stages: [
      "Blue ocean planet floating peacefully",
      "Lush emerald continents rising up",
      "Ancient green forest canopies thriving",
      "Gentle white cloud ribbons swirling",
      "Living biosphere basking in golden sunlight",
    ],
    completionTitle: "A Flourishing, Happy Planet!",
    requiredLevel: 12,
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Neon Cyber Grid",
    shortName: "Neon Grid",
    tagline: "Charge glowing circuits and pulse through futuristic cyber cityscapes",
    category: "sci-fi",
    accentColor: "#06b6d4",
    secondaryColor: "#ec4899",
    stages: [
      "Flickering neon grid wireframes boot up",
      "Glistening fiber optic pulses speed through",
      "Holographic data streams flow in sync",
      "Towering futuristic skyline sparks into light",
      "Hyperdrive laser grid in full radiant overload",
    ],
    completionTitle: "Neural Flow State Synced!",
    requiredLevel: 9,
  },
  deepocean: {
    id: "deepocean",
    name: "Deep Ocean Sanctuary",
    shortName: "Deep Ocean",
    tagline: "Submerge into tranquil abyss currents with glowing bioluminescent life",
    category: "nature",
    accentColor: "#0284c7",
    secondaryColor: "#06b6d4",
    stages: [
      "Sunlight fading into deep sapphire waters",
      "Gentle drifting sea ribbons and pearl bubbles",
      "Luminous jellyfish floating with effortless grace",
      "Vibrant coral reef waking under deep blue tides",
      "Majestic blue whale gliding through tranquil abyss",
    ],
    completionTitle: "Oceanic Peace Achieved!",
    requiredLevel: 4,
  },
  cosmic: {
    id: "cosmic",
    name: "Cosmic Nebula Voyage",
    shortName: "Cosmic Voyage",
    tagline: "Chart interstellar galaxies, swirling star dust, and stellar constellations",
    category: "sci-fi",
    accentColor: "#8b5cf6",
    secondaryColor: "#ec4899",
    stages: [
      "Stardust clouds swirling across dark space",
      "Golden pulsar beacon radiating cosmic light",
      "Ringed gas giant planet orbiting serenely",
      "Vibrant spiral galaxy spinning in celestial majesty",
      "Grand constellation shimmering across infinity",
    ],
    completionTitle: "Interstellar Sprint Conquered!",
    requiredLevel: 11,
  },
  cozycoffee: {
    id: "cozycoffee",
    name: "Cozy Café Hearth",
    shortName: "Cozy Café",
    tagline: "Warm steaming mugs, gentle acoustic melodies, and rainy window calm",
    category: "cozy",
    accentColor: "#b45309",
    secondaryColor: "#f59e0b",
    stages: [
      "Gentle rain tapping on the warm glass",
      "Fresh roasted coffee beans grinding fine",
      "Pouring velvet foam into a ceramic mug",
      "Steaming warm latte art blooming in the cup",
      "Warm corner armchair and fresh butter croissant",
    ],
    completionTitle: "Warm Brew & Clear Mind!",
    requiredLevel: 1,
  },
  enchantedforest: {
    id: "enchantedforest",
    name: "Enchanted Glen",
    shortName: "Enchanted Glen",
    tagline: "Follow mossy woodland paths where glowing fireflies dance among ancient oaks",
    category: "nature",
    accentColor: "#10b981",
    secondaryColor: "#84cc16",
    stages: [
      "Morning dew glistening on emerald moss",
      "Fern fronds unfurling along ancient roots",
      "Golden sunbeams filtering through dense canopy",
      "Dancing glowing fireflies sparkling in twilight",
      "Majestic ancient guardian oak glowing with magic",
    ],
    completionTitle: "Forest Whispers of Triumph!",
    requiredLevel: 6,
  },
  campfire: {
    id: "campfire",
    name: "Starry Night Campfire",
    shortName: "Starry Campfire",
    tagline: "Gather around crackling cedar embers beneath a vast blanket of stars",
    category: "cozy",
    accentColor: "#f97316",
    secondaryColor: "#eab308",
    stages: [
      "Stacked cedar firewood and kindling stones",
      "First spark catching warm orange tinder",
      "Lively crackling amber embers rising up",
      "Roasting marshmallows under the Milky Way",
      "Warm glowing campfire blazing with camaraderie",
    ],
    completionTitle: "Campfire Fireside Glow!",
    requiredLevel: 2,
  },
};

export type ScheduledHolidayTheme = HolidayTheme & {
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
};

function isScheduledHoliday(theme: HolidayTheme): theme is ScheduledHolidayTheme {
  return (
    theme.startMonth !== undefined &&
    theme.startDay !== undefined &&
    theme.endMonth !== undefined &&
    theme.endDay !== undefined
  );
}

export const HOLIDAY_LIST: ScheduledHolidayTheme[] = Object.values(HOLIDAY_THEMES).filter(isScheduledHoliday);

export const ALL_THEMES_LIST: HolidayTheme[] = Object.values(HOLIDAY_THEMES);

/**
 * Determines the current or nearest holiday based on a given date (defaults to today).
 */
export function getNearestHoliday(date: Date = new Date()): HolidayTheme {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  // 1. Direct active window check
  for (const theme of HOLIDAY_LIST) {
    if (theme.startMonth === theme.endMonth) {
      if (month === theme.startMonth && day >= theme.startDay && day <= theme.endDay) {
        return theme;
      }
    } else if (theme.startMonth > theme.endMonth) {
      // Wraps over New Year (e.g. Dec to Jan)
      if (
        (month === theme.startMonth && day >= theme.startDay) ||
        (month === theme.endMonth && day <= theme.endDay)
      ) {
        return theme;
      }
    } else {
      if (
        (month === theme.startMonth && day >= theme.startDay) ||
        (month === theme.endMonth && day <= theme.endDay) ||
        (month > theme.startMonth && month < theme.endMonth)
      ) {
        return theme;
      }
    }
  }

  // 2. Find closest upcoming holiday
  const currentDayOfYear = getDayOfYear(date);
  let closestTheme = HOLIDAY_THEMES.halloween;
  let minDaysDiff = Infinity;

  for (const theme of HOLIDAY_LIST) {
    const targetDate = new Date(date.getFullYear(), theme.startMonth - 1, theme.startDay);
    let targetDayOfYear = getDayOfYear(targetDate);
    if (targetDayOfYear < currentDayOfYear) {
      targetDayOfYear += 365;
    }
    const diff = targetDayOfYear - currentDayOfYear;
    if (diff < minDaysDiff) {
      minDaysDiff = diff;
      closestTheme = theme;
    }
  }

  return closestTheme;
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime() + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}
