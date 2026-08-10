/**
 * Anonymous Creative Username Generator
 * Generates random, creative, and completely anonymous usernames based on specified themes.
 * Zero PII (Personally Identifiable Information) used.
 */

export const THEME_WORD_POOLS: Record<string, { prefixes: string[]; nouns: string[] }> = {
  Cybersecurity: {
    prefixes: ["Shadow", "Cyber", "Cipher", "Shield", "Stealth", "Matrix", "Zero", "Root", "Vector", "Vault", "Phantom", "Glitch", "Binary", "Aegis", "Node", "Quantum", "Silent", "Sentry", "Crypt", "Net"],
    nouns: ["Fox", "Runner", "Nova", "Pulse", "Ghost", "Wolf", "Sentinel", "Vortex", "Protocol", "Breach", "Guard", "Falcon", "Knight", "Specter", "Shade", "Core", "Byte", "Orbit", "Drift", "Echo"]
  },
  Space: {
    prefixes: ["Lunar", "Astral", "Cosmic", "Solar", "Nebula", "Pulsar", "Orbit", "Stellar", "Quasar", "Meteor", "Astro", "Nova", "Galactic", "Eclipse", "Horizon", "Orion", "Titan", "Zenith", "Void", "Comet"],
    nouns: ["Byte", "Core", "Drift", "Pulse", "Runner", "Orbit", "Nova", "Fox", "Ray", "Rider", "Phoenix", "Storm", "Vortex", "Echo", "Phantom", "Knight", "Shade", "Beacon", "Crest", "Strider"]
  },
  Technology: {
    prefixes: ["Pixel", "Quantum", "Byte", "Circuit", "Logic", "Data", "Nano", "Micro", "Silicon", "Algo", "Terminal", "Glitch", "Hyper", "Apex", "Flux", "Photon", "Synth", "Signal", "Vector", "Code"],
    nouns: ["Phantom", "Drift", "Pulse", "Core", "Nova", "Runner", "Matrix", "Wave", "Spark", "Node", "Grid", "Shift", "Vortex", "Wolf", "Fox", "Byte", "Link", "Forge", "Burst", "Rider"]
  },
  Mystery: {
    prefixes: ["Silent", "Mystic", "Void", "Phantom", "Ghost", "Shadow", "Specter", "Veil", "Enigma", "Obscure", "Abyssal", "Mirage", "Raven", "Shrouded", "Secret", "Whisper", "Vapor", "Masked", "Echo", "Dusk"],
    nouns: ["Comet", "Pulse", "Runner", "Fox", "Wolf", "Shade", "Nova", "Vortex", "Rider", "Knight", "Echo", "Phoenix", "Strider", "Beacon", "Drift", "Raven", "Crest", "Vault", "Gazer", "Bound"]
  },
  Animals: {
    prefixes: ["Shadow", "Neon", "Cyber", "Silent", "Quantum", "Astral", "Lunar", "Mystic", "Frost", "Thunder", "Apex", "Alpha", "Iron", "Storm", "Velvet", "Emerald", "Vortex", "Wild", "Brave", "Rogue"],
    nouns: ["Fox", "Wolf", "Falcon", "Hawk", "Panther", "Cobra", "Viper", "Lynx", "Eagle", "Bear", "Raven", "Kraken", "Phoenix", "Tiger", "Dragon", "Stag", "Leopard", "Orion", "Jaguar", "Owl"]
  },
  Nature: {
    prefixes: ["Frost", "Storm", "Ember", "Thunder", "Glacier", "Crystal", "Vortex", "Horizon", "Cascade", "Summit", "Mist", "Tempest", "Ridge", "Sylvan", "Aurora", "Wild", "Zephyr", "Sol", "River", "Stone"],
    nouns: ["Fox", "Wolf", "Falcon", "Hawk", "Raven", "Bear", "Phoenix", "Drift", "Pulse", "Runner", "Core", "Shade", "Crest", "Strider", "Echo", "Vortex", "Gazer", "Ridge", "Bound", "Peak"]
  },
  Futuristic: {
    prefixes: ["Neon", "Void", "Cyber", "Quantum", "Pixel", "Hyper", "Apex", "Flux", "Photon", "Nexus", "Synthesis", "Epoch", "Kinetic", "Prime", "Warp", "Aegis", "Vector", "Optic", "Chrono", "Zero"],
    nouns: ["Orbit", "Runner", "Nova", "Drift", "Pulse", "Phantom", "Core", "Matrix", "Vortex", "Shift", "Rider", "Node", "Forge", "Strider", "Knight", "Echo", "Wave", "Grid", "Spark", "Bound"]
  }
};

export interface GenerateUsernamesOptions {
  theme?: string;
  count?: number;
  existingUsernames?: string[];
  excludePersonal?: string[];
  maxLength?: number;
  allowNumbers?: boolean;
  allowSpecial?: boolean;
}

/**
 * Checks if a candidate string contains any personal information token.
 */
function containsPersonalInfo(candidate: string, excludeTokens: string[] = []): boolean {
  const lowerCandidate = candidate.toLowerCase();
  for (const token of excludeTokens) {
    if (!token || token.trim().length < 3) continue;
    const cleanToken = token.toLowerCase().trim();
    if (lowerCandidate.includes(cleanToken)) {
      return true;
    }
  }
  return false;
}

/**
 * Generates a batch of unique, anonymous usernames.
 */
export function generateAnonymousUsernames(options: GenerateUsernamesOptions = {}): string[] {
  const {
    theme,
    count = 10,
    existingUsernames = [],
    excludePersonal = [],
    maxLength = 20,
    allowNumbers = true,
    allowSpecial = true,
  } = options;

  const results: string[] = [];
  const existingSet = new Set(existingUsernames.map(u => u.toLowerCase()));
  const availableThemes = Object.keys(THEME_WORD_POOLS);

  let attempts = 0;
  const maxAttempts = 500;

  while (results.length < count && attempts < maxAttempts) {
    attempts++;

    // Select theme pool
    let activeTheme = theme;
    if (!activeTheme || activeTheme === 'Surprise Me' || !THEME_WORD_POOLS[activeTheme]) {
      activeTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
    }

    const pool = THEME_WORD_POOLS[activeTheme] || THEME_WORD_POOLS.Cybersecurity;
    const prefix = pool.prefixes[Math.floor(Math.random() * pool.prefixes.length)];
    const noun = pool.nouns[Math.floor(Math.random() * pool.nouns.length)];

    let candidate = `${prefix}${noun}`;

    // Optionally append a number or special char if needed/desired
    const rand = Math.random();
    if (rand < 0.25 && allowNumbers) {
      const num = Math.floor(Math.random() * 90) + 10; // 10-99
      if (rand < 0.12 && allowSpecial) {
        candidate = `${prefix}_${noun}${num}`;
      } else {
        candidate = `${prefix}${noun}${num}`;
      }
    } else if (rand < 0.35 && allowSpecial) {
      candidate = `${prefix}_${noun}`;
    }

    // Format validation: 3-20 chars, letters, numbers, underscores
    if (candidate.length < 3 || candidate.length > maxLength) continue;
    if (!/^[a-zA-Z0-9_]+$/.test(candidate)) continue;

    // Check personal info containment
    if (containsPersonalInfo(candidate, excludePersonal)) continue;

    // Uniqueness checks
    const lowerCandidate = candidate.toLowerCase();
    if (existingSet.has(lowerCandidate)) continue;
    if (results.some(r => r.toLowerCase() === lowerCandidate)) continue;

    results.push(candidate);
  }

  // Fallback if needed to fill up to `count`
  while (results.length < count) {
    const fallbackThemes = Object.keys(THEME_WORD_POOLS);
    const t = fallbackThemes[results.length % fallbackThemes.length];
    const pool = THEME_WORD_POOLS[t];
    const p = pool.prefixes[Math.floor(Math.random() * pool.prefixes.length)];
    const n = pool.nouns[Math.floor(Math.random() * pool.nouns.length)];
    const candidate = `${p}${n}_${Math.floor(Math.random() * 900) + 100}`;
    if (!results.includes(candidate)) {
      results.push(candidate);
    }
  }

  return results;
}
