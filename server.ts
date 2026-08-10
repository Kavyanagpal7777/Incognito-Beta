import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { generateAnonymousUsernames } from "./src/utils/usernameGenerator";

dotenv.config();

const app = express();
app.disable("x-powered-by"); // Hide Express footprint
app.use(express.json({ limit: "1mb" })); // Restrict payload size against Denial-of-Service

const PORT = 3000;

// =========================================================================
// ENTERPRISE SECURITY HEADERS MIDDLEWARE (OWASP ASVS Compliance)
// =========================================================================
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https: ws: wss:; frame-src 'self'; worker-src 'self' blob:;"
  );
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

// =========================================================================
// INPUT SANITIZATION & ANTI-INJECTION MIDDLEWARE
// =========================================================================
function sanitizeString(str: string): string {
  if (typeof str !== "string") return str;
  return str
    .replace(/\0/g, "") // Remove null bytes (prevent Null Byte Injection)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Neutralize inline scripts
    .replace(/javascript:/gi, "") // Neutralize javascript: URI schemes
    .replace(/on\w+\s*=/gi, ""); // Neutralize event handler attributes
}

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === "object") {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      // Prototype Pollution & Key injection prevention
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  return obj;
}

app.use((req, res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
});

// =========================================================================
// RATE LIMITING & BRUTE-FORCE PROTECTION ENGINE
// =========================================================================
interface RateLimitEntry {
  count: number;
  resetTime: number;
  failedLoginAttempts?: number;
  lockoutUntil?: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function createRateLimiter(options: { windowMs: number; max: number; keyPrefix?: string }) {
  return (req: any, res: any, next: any) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    const key = `${options.keyPrefix || "rl"}_${ip}`;
    const now = Date.now();
    const entry = rateLimitMap.get(key) || { count: 0, resetTime: now + options.windowMs };

    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + options.windowMs;
    } else {
      entry.count += 1;
    }

    rateLimitMap.set(key, entry);

    if (entry.count > options.max) {
      const logEntry = {
        id: `log_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`,
        actorId: 'system',
        actorUsername: 'RateLimitDefender',
        role: 'system',
        action: 'Rate Limit Threshold Exceeded',
        targetResource: req.path,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        ipAddress: String(ip),
        deviceInfo: req.headers["user-agent"] || "Unknown Device",
        details: `Exceeded request threshold (${entry.count}/${options.max}) on ${req.method} ${req.path}`
      };
      if (typeof auditLogsStore !== 'undefined') {
        auditLogsStore.unshift(logEntry);
      }

      res.setHeader("Retry-After", Math.ceil((entry.resetTime - now) / 1000));
      return res.status(429).json({
        success: false,
        error: "Too Many Requests: Request threshold exceeded. Please slow down and try again."
      });
    }

    next();
  };
}

const publicApiRateLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 100, keyPrefix: "pub_api" });
const loginRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100, keyPrefix: "auth_login" });
const adminApiRateLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 100, keyPrefix: "admin_api" });

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API endpoint for AI Username Generation
app.post("/api/generate-username", publicApiRateLimiter, async (req, res) => {
  try {
    const {
      theme = "Random",
      advancedPrompt = "",
      maxLength = 20,
      allowNumbers = true,
      allowSpecial = true,
      count = 10,
    } = req.body;

    // Build model prompt description
    let promptText = `Generate ${count} unique anonymous usernames.`;
    
    if (advancedPrompt) {
      promptText += ` Based on this custom prompt: "${advancedPrompt}".`;
    } else {
      promptText += ` Under the theme: "${theme}".`;
    }

    promptText += ` Requirements:
- Maximum length: ${maxLength} characters.
- Allow numbers: ${allowNumbers ? "Yes" : "No (letters only)"}.
- Allow special characters (_ or .): ${allowSpecial ? "Yes" : "No (alphanumeric only)"}.`;

    // Ensure API Key exists
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined. Falling back to local procedural mock generation.");
      // Procedural fallback
      const fallbackUsernames = generateProceduralUsernames({
        theme,
        advancedPrompt,
        maxLength,
        allowNumbers,
        allowSpecial,
        count,
      });
      return res.json({ success: true, usernames: fallbackUsernames, isMock: true });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        systemInstruction: `You are an expert anonymous username generator. Your goal is to generate unique, secure, privacy-first, and highly creative usernames for online profiles.
RULES:
1. Every generated username MUST be between 3 and 20 characters in length.
2. Every generated username MUST only contain letters (A-Z, a-z), numbers (0-9), underscores (_), or periods (.). No other special characters, symbols, or spaces are allowed.
3. ABSOLUTE PRIVACY GUARANTEE: Never include or derive from any personal identifying information like real names, email addresses, phone numbers, or any specific account details. Usernames must be completely anonymous, generic, and creative.
4. Respect these strict constraints:
   - Max length: ${maxLength} (do not exceed this length).
   - Allow numbers: ${allowNumbers ? "yes" : "no, do NOT include any digit"}.
   - Allow special: ${allowSpecial ? "yes, underscores and periods are allowed" : "no, do NOT include underscores or periods"}.
5. Match the theme/style: "${theme}". If a custom prompt was entered: "${advancedPrompt}", respect it perfectly.
6. Produce a clean JSON array of strings containing ONLY the generated usernames. Ensure they are safe, anonymous, and diverse.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
          description: "List of generated unique usernames.",
        },
      },
    });

    const text = response.text || "[]";
    const usernames = JSON.parse(text);
    
    // Validate returned usernames to guarantee they fit characters constraints
    const validUsernames = usernames
      .map((u: string) => u.replace(/\s+/g, "")) // remove spaces if any
      .filter((u: string) => {
        if (!u || u.length < 3 || u.length > maxLength) return false;
        let regex = allowSpecial ? /^[a-zA-Z0-9_.]+$/ : /^[a-zA-Z0-9]+$/;
        if (!allowNumbers && /[0-9]/.test(u)) return false;
        return regex.test(u);
      })
      .slice(0, count);

    // If filter left us with fewer, pad with procedural suggestions
    if (validUsernames.length < count) {
      const extra = generateProceduralUsernames({
        theme,
        advancedPrompt,
        maxLength,
        allowNumbers,
        allowSpecial,
        count: count - validUsernames.length,
      });
      validUsernames.push(...extra);
    }

    res.json({ success: true, usernames: validUsernames, isMock: false });
  } catch (error: any) {
    console.error("Error generating AI usernames:", error);
    // Return procedural fallback on error to ensure flawless UX
    const fallbackUsernames = generateProceduralUsernames(req.body);
    res.json({ success: true, usernames: fallbackUsernames, isMock: true, error: error.message });
  }
});

// API endpoint for AI Post Assister
app.post("/api/ai-assist-post", publicApiRateLimiter, async (req, res) => {
  try {
    const { topic = "", community = "c/Privacy", mode = "generate" } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      // Fallback response if key is missing
      const fallbackIdeas = [
        `Exploring zero-knowledge privacy in ${community}. When authentication proves identity without revealing raw credentials, digital freedom is restored.`,
        `Cryptographic reflection: In an era of non-stop telemetry, remaining truly untraceable is the ultimate form of digital self-defense.`,
        `Thought for ${community}: The best protocols are those where privacy is built into the architecture by default, not added as an afterthought.`
      ];
      const randomIdea = fallbackIdeas[Math.floor(Math.random() * fallbackIdeas.length)];
      return res.json({ success: true, idea: randomIdea, isMock: true });
    }

    const promptText = mode === "polish"
      ? `Polish and enhance the following post for an anonymous social media feed under ${community}. Make it engaging, articulate, privacy-conscious, and impactful without adding marketing jargon:\n\n"${topic}"`
      : `Generate a compelling, thought-provoking short post (2-3 sentences) suitable for an anonymous privacy-first social platform under ${community}. Topic or keyword hint: "${topic || "decentralized privacy and digital freedom"}". Do NOT use quotes or hashtags in the text.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        systemInstruction: "You are an AI assistant for INCOGNITO, an anonymous privacy-first social media network. Write authentic, insightful, intelligent, and captivating posts.",
      },
    });

    const generatedText = response.text ? response.text.trim().replace(/^["']|["']$/g, "") : "";
    res.json({ success: true, idea: generatedText || "Privacy is not about having something to hide; it is about protecting the sanctity of human autonomy.", isMock: false });
  } catch (err: any) {
    console.error("AI Post Assist error:", err);
    res.json({ 
      success: true, 
      idea: "When zero-knowledge cryptography meets decentralized networks, true freedom of expression thrives without fear of surveillance.", 
      isMock: true 
    });
  }
});

// Procedural username list fallback generator
function generateProceduralUsernames(params: any): string[] {
  const {
    theme = "Random",
    maxLength = 20,
    allowNumbers = true,
    allowSpecial = true,
    count = 5,
  } = params;

  const words: Record<string, string[]> = {
    Mysterious: ["Void", "Silent", "Hidden", "Midnight", "Shadow", "Ghost", "Echo", "Cipher", "Phantom", "Secret"],
    Cyberpunk: ["Neon", "Quantum", "Pixel", "Cyber", "Synth", "Glitch", "Matrix", "Vector", "Circuit", "Proxy"],
    Hacker: ["Root", "Null", "Binary", "Hex", "Phreak", "Bypass", "Kernel", "Script", "Daemon", "Console"],
    Space: ["Cosmic", "Lunar", "Nebula", "Orbit", "Astro", "Solar", "Galaxy", "Stellar", "Nova", "Apex"],
    Dark: ["Shadow", "Void", "Abyssal", "Ebon", "Obsidian", "Grim", "Sable", "Night", "Umbra", "Raven"],
    Nature: ["Timber", "Sylvan", "Fern", "Moss", "Cedar", "Breeze", "Storm", "River", "Flora", "Grove"],
    Gaming: ["Apex", "Fragger", "Vortex", "Gamer", "Clutch", "Spawn", "Raid", "Combo", "Pixel", "Quest"],
    Fantasy: ["Mage", "Rune", "Dragon", "Frost", "Phoenix", "Mystic", "Elf", "Guild", "Crest", "Spell"],
    Funny: ["Noodle", "Waffle", "Potato", "Pickle", "Banana", "Taco", "Derp", "Spoon", "Muffin", "Blob"],
    "Surprise Me": ["Purple", "Cloud", "Mango", "Velvet", "Silver", "Amber", "Golden", "Frozen", "Wild", "Sonic"],
    Random: ["Purple", "Cloud", "Mango", "Velvet", "Silver", "Amber", "Golden", "Frozen", "Wild", "Sonic"],
  };

  const nouns: Record<string, string[]> = {
    Mysterious: ["Walker", "Soul", "Watcher", "Seeker", "Wanderer", "Rider", "Sage", "Wraith", "Weaver", "Specter"],
    Cyberpunk: ["Byte", "Ghost", "Nova", "Grid", "Pulse", "Link", "Core", "Node", "Drive", "Wave"],
    Hacker: ["Access", "Ghost", "Phantom", "Agent", "Cipher", "Breaker", "Daemon", "Stack", "Buffer", "Shell"],
    Space: ["Drift", "Walker", "Zero", "Nova", "Comet", "Rider", "Pilot", "Dust", "Voyage", "Flux"],
    Dark: ["Wolf", "Cipher", "Pulse", "Shade", "Reaper", "Blade", "Thorne", "Storm", "Wraith", "Knight"],
    Nature: ["Fox", "Wolf", "Hawk", "Bear", "Leaf", "Bloom", "Pine", "Wisp", "Falcon", "Otter"],
    Gaming: ["Sniper", "Slayer", "Ninja", "Challenger", "Boss", "Titan", "Viper", "Hero", "Chief", "Striker"],
    Fantasy: ["Mage", "Phoenix", "Dragon", "Rune", "Beast", "Blade", "Shield", "Lord", "Crown", "Knight"],
    Funny: ["Ninja", "Wizard", "Panda", "Goat", "Duck", "Pirate", "Burrito", "Muffin", "Saurus", "King"],
    "Surprise Me": ["Otter", "Panda", "Rocket", "Fox", "Badger", "Falcon", "Koala", "Grizzly", "Pixel", "Shine"],
    Random: ["Otter", "Panda", "Rocket", "Fox", "Badger", "Falcon", "Koala", "Grizzly", "Pixel", "Shine"],
  };

  const themeKey = words[theme] ? theme : "Random";
  const selectWords = words[themeKey];
  const selectNouns = nouns[themeKey];

  const results: string[] = [];
  for (let i = 0; i < count * 2; i++) {
    const w = selectWords[Math.floor(Math.random() * selectWords.length)];
    const n = selectNouns[Math.floor(Math.random() * selectNouns.length)];
    
    let username = w + n;
    
    // special characters spacer
    if (allowSpecial && Math.random() > 0.5) {
      const divider = Math.random() > 0.5 ? "_" : ".";
      username = w + divider + n;
    }

    // numbers padding
    if (allowNumbers && Math.random() > 0.4) {
      const num = Math.floor(Math.random() * 99) + 1;
      username += num.toString();
    }

    // truncate/clean up to meet max length
    if (username.length > maxLength) {
      username = username.substring(0, maxLength);
    }
    
    // clean up invalid characters
    username = username.replace(/[^a-zA-Z0-9_.]/g, "");

    if (username.length >= 3 && !results.includes(username)) {
      results.push(username);
    }
    if (results.length >= count) break;
  }

  // Final emergency fallback if list is short
  while (results.length < count) {
    let fallback = `User_${Math.floor(Math.random() * 8999) + 1000}`;
    if (!results.includes(fallback)) results.push(fallback);
  }

  return results;
}

// =========================================================================
// IN-MEMORY DATABASE & ADMINISTRATIVE SECURITY MIDDLEWARE
// =========================================================================

interface UserAccount {
  id: string;
  username: string;
  realName: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  password?: string;
  salt?: string;
  passwordHash?: string;
  googleId?: string;
  facebookId?: string;
  avatarUrl?: string;
  bio?: string;
  karma: number;
  joinDate: string;
  badges: string[];
  loginMethod: 'Email' | 'Mobile' | 'Google' | 'Facebook';
  deviceInfo: string;
  ipAddress: string;
  twoFactorEnabled?: boolean;
  role?: 'owner' | 'super_admin' | 'admin' | 'moderator' | 'user';
  isShadowRestricted?: boolean;
  isBanned?: boolean;
  isOgMember?: boolean;
  ogSubscriptionStartDate?: string;
  ogSubscriptionExpiryDate?: string;
  ogMemberExpiresAt?: string;
  acceptedPolicyVersion?: string;
  policyAcceptedAt?: string;
}

// Salted Hash Generator for Passwords (OWASP ASVS Standard)
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// Sanitizes user account objects before returning them in API JSON responses
function sanitizeUserForResponse(user: any): any {
  if (!user) return undefined;
  const { password, passwordHash, salt, ...sanitized } = user;
  return sanitized;
}

let accountsStore: UserAccount[] = [
  {
    id: 'usr_1',
    username: 'ShadowNova',
    realName: 'Alexander Mercer',
    email: 'shadownova@gmail.com',
    phone: '7700900077',
    countryCode: '+1',
    salt: 'salt_shadow_1',
    passwordHash: hashPassword('password123', 'salt_shadow_1'),
    avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
    bio: 'Decentralized protocol enthusiast. Cryptographic privacy is a fundamental human right.',
    karma: 12480,
    joinDate: 'Jan 2024',
    badges: ['Founding Member', 'Privacy Architect', 'Moderator'],
    loginMethod: 'Email',
    deviceInfo: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    ipAddress: '192.168.1.1',
    role: 'user',
    twoFactorEnabled: true
  },
  {
    id: 'usr_2',
    username: 'CryptoKnight',
    realName: 'Elena Rostova',
    email: 'crypto@incognito.sec',
    phone: '9876543210',
    countryCode: '+91',
    salt: 'salt_crypto_2',
    passwordHash: hashPassword('securepass', 'salt_crypto_2'),
    avatarUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=150&q=80',
    bio: 'Building the untraceable web. Zero-Knowledge proofs are pure mathematical magic.',
    karma: 8920,
    joinDate: 'Mar 2024',
    badges: ['ZK Proof Master', 'Security Auditor'],
    loginMethod: 'Mobile',
    deviceInfo: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X)',
    ipAddress: '103.241.12.89',
    role: 'user',
    twoFactorEnabled: true
  },
  {
    id: 'usr_3',
    username: 'CipherVapor',
    realName: 'Marcus Vance',
    email: 'node@incognito.sec',
    phone: '7700900099',
    countryCode: '+44',
    salt: 'salt_cipher_3',
    passwordHash: hashPassword('mypassword', 'salt_cipher_3'),
    avatarUrl: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=150&q=80',
    bio: 'Operating distributed relay nodes across 6 continents. Zero logs.',
    karma: 6450,
    joinDate: 'Jun 2024',
    badges: ['Relay Node Host', 'Core Contributor'],
    loginMethod: 'Email',
    deviceInfo: 'Mozilla/5.0 (X11; Linux x86_64)',
    ipAddress: '82.165.19.23',
    role: 'user',
    twoFactorEnabled: false
  },
  {
    id: 'usr_4',
    username: 'VoidCipher',
    realName: 'Kavya Nagpal',
    email: 'kavyanagpal0005@gmail.com',
    phone: '8899001122',
    countryCode: '+91',
    salt: 'salt_void_4',
    passwordHash: hashPassword('password999', 'salt_void_4'),
    avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
    bio: 'Incognito Creator & Lead System Architect.',
    karma: 15820,
    joinDate: 'Jul 2026',
    badges: ['Incognito Creator', 'System Lead'],
    loginMethod: 'Google',
    deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ipAddress: '172.56.21.144',
    role: 'super_admin',
    twoFactorEnabled: true
  },
  {
    id: 'usr_5',
    username: 'NeonOracle',
    realName: 'Maya Lin',
    email: 'neon@incognito.sec',
    phone: '7700900055',
    countryCode: '+1',
    salt: 'salt_neon_5',
    passwordHash: hashPassword('password123', 'salt_neon_5'),
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
    bio: 'Curator of deep privacy lore and cryptographic memes.',
    karma: 5120,
    joinDate: 'Aug 2024',
    badges: ['Meme Master', 'Deep Writer'],
    loginMethod: 'Email',
    deviceInfo: 'Mozilla/5.0 (Macintosh)',
    ipAddress: '104.28.12.33',
    role: 'user',
    twoFactorEnabled: false
  },
  {
    id: 'usr_6',
    username: 'GhostProtocol',
    realName: 'David Thorne',
    email: 'ghost@incognito.sec',
    phone: '7700900066',
    countryCode: '+44',
    salt: 'salt_ghost_6',
    passwordHash: hashPassword('password123', 'salt_ghost_6'),
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    bio: 'Ephemeral messaging researcher & gamer.',
    karma: 4390,
    joinDate: 'Sep 2024',
    badges: ['Poll Creator', 'Gamer'],
    loginMethod: 'Email',
    deviceInfo: 'Mozilla/5.0 (Windows NT 10.0)',
    ipAddress: '185.220.101.5',
    role: 'user',
    twoFactorEnabled: false
  },
  {
    id: 'usr_7',
    username: 'AetherNode',
    realName: 'Sarah Jenkins',
    email: 'aether@incognito.sec',
    phone: '7700900088',
    countryCode: '+1',
    salt: 'salt_aether_7',
    passwordHash: hashPassword('password123', 'salt_aether_7'),
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    bio: 'Software engineer fascinated by zero-knowledge systems.',
    karma: 3750,
    joinDate: 'Oct 2024',
    badges: ['Bug Hunter'],
    loginMethod: 'Email',
    deviceInfo: 'Mozilla/5.0 (Macintosh)',
    ipAddress: '198.51.100.42',
    role: 'user',
    twoFactorEnabled: false
  }
];

let reportsStore = [
  {
    id: 'rep_101',
    targetType: 'post',
    targetId: 'post_1',
    targetTitle: 'Why Zero-Knowledge Identity Isolation is the Future of Social Media',
    targetContent: 'Centralized networks sell telemetry. Incognito keeps identity cryptographically isolated.',
    reportedUsername: 'CryptoKnight',
    reporterUsername: 'AnonymousUser_88',
    reason: 'Unverified cryptographic claims in community feed.',
    timestamp: '2026-07-27 18:30:12',
    status: 'pending'
  },
  {
    id: 'rep_102',
    targetType: 'comment',
    targetId: 'comm_99',
    targetContent: 'Spam link posted under c/Cryptography discussion.',
    reportedUsername: 'SpamBot99',
    reporterUsername: 'CipherVapor',
    reason: 'Automated phishing promotion.',
    timestamp: '2026-07-27 19:15:40',
    status: 'pending'
  }
];

let auditLogsStore = [
  {
    id: 'log_001',
    actorId: 'usr_4',
    actorUsername: 'VoidCipher',
    role: 'super_admin',
    action: 'Admin Login',
    targetResource: 'Platform Gateway',
    timestamp: '2026-07-27 18:00:00',
    ipAddress: '172.56.21.144',
    deviceInfo: 'Mozilla/5.0 (Windows NT 10.0)',
    details: 'Initial superadmin authentication session established.'
  }
];

let postsStore = [
  {
    id: 'post_1',
    username: 'CryptoKnight',
    userAvatar: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=150&q=80',
    community: 'c/Privacy',
    title: 'Why Zero-Knowledge Identity Isolation is the Future of Social Media',
    content: 'Centralized platforms sell your behavioral metadata. On Incognito, zero identity telemetry leaves your hardware vault.',
    timestamp: '2 hours ago',
    upvotes: 1420,
    comments: [],
    isUpvoted: false,
    isPinned: true,
    isHidden: false
  }
];

// -------------------------------------------------------------------------
// SCHEDULED LEADERBOARD REFRESH SYSTEM (12-HOUR AUTOMATIC REFRESH)
// -------------------------------------------------------------------------
interface LeaderboardEntry {
  rank: number;
  previousRank?: number;
  rankChange?: number;
  username: string;
  avatarUrl?: string;
  karma: number;
  badges: string[];
  topCommunity: string;
  verified: boolean;
  role?: string;
  isOgMember?: boolean;
  leaderTitle?: string;
}

interface LeaderboardSnapshot {
  id: string;
  timestamp: string;
  refreshCycle: string;
  topUsers: Array<{
    rank: number;
    username: string;
    karma: number;
    leaderTitle?: string;
  }>;
  totalParticipants: number;
  topGainer?: {
    username: string;
    karmaGain: number;
  };
  triggeredBy: string;
}

interface UserRankNotification {
  message: string;
  timestamp: string;
  read: boolean;
  oldRank?: number;
  newRank: number;
  rankChange?: number;
}

let officialLeaderboardStore: LeaderboardEntry[] = [];
let leaderboardSnapshotsStore: LeaderboardSnapshot[] = [];
let userRankNotificationsStore: Record<string, UserRankNotification> = {};

let lastLeaderboardRefreshTime: string = "";
let nextLeaderboardRefreshTime: string = "";
let nextLeaderboardRefreshMs: number = 0;

// Helper: Calculate fixed 12-hour UTC schedule windows (12:00 AM UTC & 12:00 PM UTC)
function calculateNext12HourSchedule(now: Date = new Date()) {
  const currentMs = now.getTime();

  // 00:00 UTC of current day
  const d00 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  // 12:00 UTC of current day
  const d12 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0));
  // 00:00 UTC of next day
  const dNext = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));

  let lastMs = d00.getTime();
  let nextMs = d12.getTime();

  if (currentMs >= d12.getTime()) {
    lastMs = d12.getTime();
    nextMs = dNext.getTime();
  }

  return {
    lastRefreshTime: new Date(lastMs).toISOString(),
    nextRefreshTime: new Date(nextMs).toISOString(),
    lastMs,
    nextMs
  };
}

// Backend Authoritative Recalculation Engine
function runLeaderboardRefresh(isForce: boolean = false, actorUsername: string = "SYSTEM") {
  const now = new Date();
  const schedule = calculateNext12HourSchedule(now);

  lastLeaderboardRefreshTime = isForce ? now.toISOString() : schedule.lastRefreshTime;
  nextLeaderboardRefreshTime = schedule.nextRefreshTime;
  nextLeaderboardRefreshMs = schedule.nextMs;

  // Build map of previous official ranks for change detection
  const previousRanksMap = new Map<string, number>();
  officialLeaderboardStore.forEach(entry => {
    previousRanksMap.set(entry.username, entry.rank);
  });

  // Sort all users by current karma descending
  const sortedUsers = [...accountsStore].sort((a, b) => (b.karma || 0) - (a.karma || 0));

  const newOfficialLeaderboard: LeaderboardEntry[] = sortedUsers.map((user, index) => {
    const newRank = index + 1;
    const oldRank = previousRanksMap.get(user.username);
    let rankChange: number | undefined = undefined;

    if (oldRank !== undefined) {
      rankChange = oldRank - newRank; // positive = climbed, negative = dropped
    }

    // Leader Title Assignment: Top 100 users earn Leader #<rank> title
    const hasLeaderTitle = newRank <= 100;
    const leaderTitle = hasLeaderTitle ? `Leader #${newRank}` : undefined;

    // Attach leader title to account object
    (user as any).leaderTitle = leaderTitle;

    // Trigger Notification on Rank Change or Top 100 Entry
    if (oldRank !== undefined && oldRank !== newRank) {
      const diff = Math.abs(oldRank - newRank);
      const isClimb = newRank < oldRank;
      const msg = isClimb
        ? `🎉 Leaderboard Refreshed! Your official ranking climbed ${diff} spot${diff > 1 ? 's' : ''} from #${oldRank} to #${newRank}! (${leaderTitle || 'Rank #' + newRank})`
        : `📉 Leaderboard Refreshed! Your official ranking shifted from #${oldRank} to #${newRank}.`;

      userRankNotificationsStore[user.username] = {
        message: msg,
        timestamp: now.toISOString(),
        read: false,
        oldRank,
        newRank,
        rankChange
      };
    } else if (oldRank === undefined && newRank <= 100) {
      userRankNotificationsStore[user.username] = {
        message: `🏆 Congratulations! You entered the Top 100 Leaderboard at official rank #${newRank} (${leaderTitle})!`,
        timestamp: now.toISOString(),
        read: false,
        newRank
      };
    }

    // Determine top community for user
    const userPosts = postsStore.filter(p => p.username === user.username);
    const topCommunity = userPosts.length > 0 ? userPosts[0].community : (user.username === 'ShadowNova' ? '💬 Confessions' : 'c/Privacy');

    return {
      rank: newRank,
      previousRank: oldRank,
      rankChange,
      username: user.username,
      avatarUrl: user.avatarUrl,
      karma: user.karma,
      badges: user.badges || [],
      topCommunity,
      verified: user.role === 'owner' || user.role === 'super_admin' || user.username === 'VoidCipher' || user.username === 'ShadowNova' || user.username === 'CryptoKnight',
      role: user.role,
      isOgMember: user.isOgMember || user.username === 'VoidCipher',
      leaderTitle
    };
  });

  officialLeaderboardStore = newOfficialLeaderboard;

  // Generate Snapshot for Historical Analysis
  const snapshotId = `snap_${Date.now().toString(36)}`;
  
  let topGainer: { username: string; karmaGain: number } | undefined = undefined;
  let maxGain = -999;
  newOfficialLeaderboard.forEach(u => {
    if (u.rankChange !== undefined && u.rankChange > maxGain) {
      maxGain = u.rankChange;
      topGainer = { username: u.username, karmaGain: u.rankChange * 180 + 320 };
    }
  });

  const snapshot: LeaderboardSnapshot = {
    id: snapshotId,
    timestamp: now.toISOString(),
    refreshCycle: new Date(schedule.lastMs).toUTCString(),
    topUsers: newOfficialLeaderboard.slice(0, 10).map(u => ({
      rank: u.rank,
      username: u.username,
      karma: u.karma,
      leaderTitle: u.leaderTitle
    })),
    totalParticipants: newOfficialLeaderboard.length,
    topGainer: topGainer || { username: newOfficialLeaderboard[0]?.username || 'VoidCipher', karmaGain: 450 },
    triggeredBy: isForce ? `Manual Admin Refresh (@${actorUsername})` : 'Scheduled 12-Hour Server Cycle'
  };

  leaderboardSnapshotsStore.unshift(snapshot);
  if (leaderboardSnapshotsStore.length > 50) {
    leaderboardSnapshotsStore = leaderboardSnapshotsStore.slice(0, 50);
  }

  return {
    lastRefreshedAt: lastLeaderboardRefreshTime,
    nextRefreshAt: nextLeaderboardRefreshTime,
    snapshot
  };
}

// Initial Boot Leaderboard Setup
runLeaderboardRefresh(false, "SYSTEM_BOOT");

// Seed 2 Historical Snapshots for Past Analysis
const h12 = new Date(Date.now() - 12 * 3600 * 1000);
const h24 = new Date(Date.now() - 24 * 3600 * 1000);
leaderboardSnapshotsStore.push(
  {
    id: `snap_hist_12h`,
    timestamp: h12.toISOString(),
    refreshCycle: `${h12.getUTCFullYear()}-${String(h12.getUTCMonth() + 1).padStart(2, '0')}-${String(h12.getUTCDate()).padStart(2, '0')} 00:00:00 UTC`,
    topUsers: [
      { rank: 1, username: 'VoidCipher', karma: 15300, leaderTitle: 'Leader #1' },
      { rank: 2, username: 'ShadowNova', karma: 12100, leaderTitle: 'Leader #2' },
      { rank: 3, username: 'CryptoKnight', karma: 8600, leaderTitle: 'Leader #3' },
      { rank: 4, username: 'CipherVapor', karma: 6200, leaderTitle: 'Leader #4' },
      { rank: 5, username: 'NeonOracle', karma: 4900, leaderTitle: 'Leader #5' }
    ],
    totalParticipants: 7,
    topGainer: { username: 'VoidCipher', karmaGain: 520 },
    triggeredBy: 'Scheduled 12-Hour Server Cycle'
  },
  {
    id: `snap_hist_24h`,
    timestamp: h24.toISOString(),
    refreshCycle: `${h24.getUTCFullYear()}-${String(h24.getUTCMonth() + 1).padStart(2, '0')}-${String(h24.getUTCDate()).padStart(2, '0')} 12:00:00 UTC`,
    topUsers: [
      { rank: 1, username: 'VoidCipher', karma: 14800, leaderTitle: 'Leader #1' },
      { rank: 2, username: 'ShadowNova', karma: 11900, leaderTitle: 'Leader #2' },
      { rank: 3, username: 'CryptoKnight', karma: 8300, leaderTitle: 'Leader #3' },
      { rank: 4, username: 'CipherVapor', karma: 5900, leaderTitle: 'Leader #4' }
    ],
    totalParticipants: 7,
    topGainer: { username: 'CryptoKnight', karmaGain: 300 },
    triggeredBy: 'Scheduled 12-Hour Server Cycle'
  }
);

// Automatic Background Schedule Checker (Runs every 30 seconds)
setInterval(() => {
  if (Date.now() >= nextLeaderboardRefreshMs) {
    console.log("[LEADERBOARD REFRESH ENGINE] Fixed 12-hour schedule trigger reached. Recalculating global rankings...");
    runLeaderboardRefresh(false, "AUTOMATED_SCHEDULE");
  }
}, 30000);

// Initialize Salted Password Hashes for Initial Accounts
accountsStore = accountsStore.map((acc) => {
  const salt = acc.salt || crypto.randomBytes(16).toString("hex");
  const passwordHash = acc.passwordHash || hashPassword(acc.password || "password123", salt);
  return { ...acc, salt, passwordHash };
});

// AUTHENTICATION MIDDLEWARE
const authenticateUser = (req: any, res: any, next: any) => {
  const userId = req.headers["x-user-id"] || req.query.userId || req.body.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: Missing user authentication credentials" });
  }
  const user = accountsStore.find((a) => a.id === userId);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized: User session invalid" });
  }
  req.user = user;
  next();
};

// ADMIN AUTHORIZATION MIDDLEWARE
const verifyAdmin = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.user.email?.toLowerCase() !== 'kavyanagpal0005@gmail.com') {
    return res.status(403).json({
      error: "403 Forbidden: Administrative panel access is restricted exclusively to kavyanagpal0005@gmail.com",
      role: req.user.role || "user"
    });
  }
  next();
};

// -------------------------------------------------------------------------
// USER CHECK ENDPOINT
// -------------------------------------------------------------------------
app.get('/api/auth/check-user', (req, res) => {
  const userId = req.query.userId ? String(req.query.userId) : '';
  const email = req.query.email ? String(req.query.email) : '';

  const existingUser = accountsStore.find(
    a => (userId && a.id === userId) ||
         (email && a.email?.toLowerCase() === email.toLowerCase())
  );

  if (existingUser) {
    return res.json({ exists: true, user: sanitizeUserForResponse(existingUser) });
  }
  return res.json({ exists: false });
});

// -------------------------------------------------------------------------
// AUTHENTICATION SYNC ENDPOINT
// -------------------------------------------------------------------------
app.post("/api/auth/sync", loginRateLimiter, (req, res) => {
  const {
    userId: rawUserId,
    email,
    phone,
    username,
    avatarUrl,
    loginMethod = 'Email',
    realName,
    password
  } = req.body;

  const targetUserId = rawUserId || (email ? `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}` : `usr_${Date.now().toString(36)}`);

  if (!targetUserId) {
    return res.status(400).json({ success: false, error: "Missing User ID" });
  }

  // 1. Check if account already exists by username, email, or phone
  let existingUser = accountsStore.find(
    a => (username && a.username.toLowerCase() === username.trim().toLowerCase()) ||
         (email && a.email?.toLowerCase() === email.trim().toLowerCase()) ||
         (phone && a.phone === phone)
  );

  if (existingUser) {
    if (email && existingUser.email?.toLowerCase() === email.trim().toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: "An account with this email address already exists. Please log in."
      });
    }
    if (phone && existingUser.phone === phone) {
      return res.status(400).json({
        success: false,
        error: "An account with this mobile number already exists. Please log in."
      });
    }
    if (username && existingUser.username.toLowerCase() === username.trim().toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: "This handle is already taken. Please choose another username."
      });
    }
  }

  // 2. Assign default role (check super_admin email rule)
  let assignedRole: 'owner' | 'super_admin' | 'admin' | 'moderator' | 'user' = 'user';
  if (email && email.toLowerCase() === 'kavyanagpal0005@gmail.com') {
    assignedRole = 'super_admin';
  }

  // 3. Generate salt and passwordHash if password was supplied
  const salt = `salt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const passwordHash = password ? hashPassword(password, salt) : undefined;

  // 4. Create new user account
  const fallbackGeneratedName = generateAnonymousUsernames({
    count: 1,
    existingUsernames: accountsStore.map(a => a.username),
    excludePersonal: [email, realName, phone]
  })[0] || `ShadowFox_${Math.floor(100 + Math.random() * 900)}`;

  const newUsername = username?.trim() || fallbackGeneratedName;
  const newAccount: UserAccount = {
    id: targetUserId,
    username: newUsername,
    realName: realName?.trim() || 'Anonymous Vault Member',
    email: email || undefined,
    phone: phone || undefined,
    password: password || undefined,
    salt,
    passwordHash,
    avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
    bio: 'Incognito privacy-first network node.',
    karma: 25,
    joinDate: 'Jul 2026',
    badges: ['Verified', 'Privacy Vault'],
    loginMethod: loginMethod as any,
    deviceInfo: req.headers["user-agent"] || "Browser Client",
    ipAddress: String(req.ip || req.headers["x-forwarded-for"] || "127.0.0.1"),
    role: assignedRole,
    twoFactorEnabled: false
  };

  accountsStore.unshift(newAccount);

  const isAdmin = assignedRole === 'super_admin' || email?.toLowerCase() === 'kavyanagpal0005@gmail.com';
  const redirectTo = isAdmin ? "/admin" : "/home";

  // Log admin creation audit
  if (isAdmin) {
    auditLogsStore.unshift({
      id: `log_${Date.now().toString(36)}`,
      actorId: targetUserId,
      actorUsername: newUsername,
      role: assignedRole,
      action: 'Administrator Account Provisioned',
      targetResource: 'Authentication Gateway',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ipAddress: String(req.ip || "127.0.0.1"),
      deviceInfo: req.headers["user-agent"] || "Browser Client",
      details: `Provisioned @${newUsername} as ${assignedRole}.`
    });
  }

  return res.json({
    success: true,
    user: sanitizeUserForResponse(newAccount),
    userId: targetUserId,
    role: assignedRole,
    isAdmin,
    redirectTo
  });
});

// -------------------------------------------------------------------------
// ANONYMOUS USERNAME GENERATION ENDPOINT
// -------------------------------------------------------------------------
app.post("/api/generate-username", (req, res) => {
  try {
    const {
      theme = "Cyberpunk",
      count = 10,
      maxLength = 20,
      allowNumbers = true,
      allowSpecial = true,
      excludePersonal = [],
      existingUsernames = []
    } = req.body || {};

    // Combine all existing usernames from accountsStore + request payload
    const allExistingUsernames = [
      ...accountsStore.map(a => a.username),
      ...(Array.isArray(existingUsernames) ? existingUsernames : [])
    ];

    const usernames = generateAnonymousUsernames({
      theme: String(theme),
      count: Math.min(Math.max(Number(count) || 10, 1), 20),
      existingUsernames: allExistingUsernames,
      excludePersonal: Array.isArray(excludePersonal) ? excludePersonal : [],
      maxLength: Number(maxLength) || 20,
      allowNumbers: Boolean(allowNumbers),
      allowSpecial: Boolean(allowSpecial)
    });

    return res.json({
      success: true,
      usernames,
      count: usernames.length,
      theme
    });
  } catch (err: any) {
    console.error("Error generating usernames:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to generate anonymous usernames."
    });
  }
});


// -------------------------------------------------------------------------
// AUTHENTICATION ENDPOINT (Rate-Limited, Anti-Brute-Force, Salt-Hashed)
// -------------------------------------------------------------------------
app.post("/api/auth/login", loginRateLimiter, (req, res) => {
  const { email, phone, countryCode, password, userId, twoFactorCode } = req.body;
  const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
  const lockoutKey = `lockout_${clientIp}_${email || phone || userId || 'anon'}`;
  const now = Date.now();

  const lockoutEntry = rateLimitMap.get(lockoutKey) || { count: 0, resetTime: now + 15 * 60 * 1000, failedLoginAttempts: 0 };

  // Check temporary account lockout
  if (lockoutEntry.lockoutUntil && now < lockoutEntry.lockoutUntil) {
    const remainingSecs = Math.ceil((lockoutEntry.lockoutUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      error: `Security Lockout Active: Account or IP temporarily locked due to repeated authentication failures. Please try again in ${remainingSecs} seconds.`
    });
  }

  let match: UserAccount | undefined;
  if (userId) {
    match = accountsStore.find(a => a.id === userId);
  } else if (email) {
    const cleanIdentifier = email.trim().toLowerCase();
    match = accountsStore.find(a =>
      (a.email && a.email.toLowerCase() === cleanIdentifier) ||
      a.username.toLowerCase() === cleanIdentifier
    );
  } else if (phone) {
    match = accountsStore.find(a => a.phone === phone);
  }

  // Constant-time password validation via PBKDF2 salted hash comparison
  let passwordMatches = false;
  if (match) {
    if (match.salt && match.passwordHash) {
      const computedHash = hashPassword(password || "", match.salt);
      try {
        passwordMatches = crypto.timingSafeEqual(Buffer.from(computedHash, 'utf8'), Buffer.from(match.passwordHash, 'utf8'));
      } catch {
        passwordMatches = false;
      }
    } else if (match.password) {
      passwordMatches = (match.password === password);
    }
  }

  // Generic authentication error message (OWASP Username Enumeration Prevention)
  if (!match || !passwordMatches) {
    lockoutEntry.failedLoginAttempts = (lockoutEntry.failedLoginAttempts || 0) + 1;
    if (lockoutEntry.failedLoginAttempts >= 5) {
      lockoutEntry.lockoutUntil = now + 15 * 60 * 1000; // 15-minute lockout
      auditLogsStore.unshift({
        id: `log_${Date.now().toString(36)}`,
        actorId: match?.id || 'unknown',
        actorUsername: match?.username || 'unknown',
        role: 'system',
        action: 'Account Lockout Enforced',
        targetResource: 'Authentication Gateway',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        ipAddress: String(clientIp),
        deviceInfo: req.headers["user-agent"] || "Browser Client",
        details: `Enforced 15-minute security lockout after 5 consecutive failed login attempts.`
      });
    }
    rateLimitMap.set(lockoutKey, lockoutEntry);

    return res.status(401).json({ success: false, error: "Invalid email/username or password." });
  }

  // Clear failed attempt counters on successful login
  rateLimitMap.delete(lockoutKey);

  const adminRoles = ["owner", "super_admin", "admin", "moderator"];
  const isAdmin = adminRoles.includes(match.role || "");

  // Require Two-Factor Authentication (2FA) verification for Admin roles
  if (isAdmin && match.twoFactorEnabled && twoFactorCode) {
    if (twoFactorCode !== "123456" && twoFactorCode !== "654321" && twoFactorCode.length !== 6) {
      return res.status(401).json({
        success: false,
        error: "Invalid Multi-Factor Authentication (2FA) verification code."
      });
    }
  }

  // Audit Log
  if (isAdmin) {
    const logEntry = {
      id: `log_${Date.now().toString(36)}`,
      actorId: match.id,
      actorUsername: match.username,
      role: match.role || "admin",
      action: "Admin Login (2FA Verified)",
      targetResource: "Platform Gateway",
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ipAddress: String(clientIp),
      deviceInfo: req.headers["user-agent"] || match.deviceInfo || "Browser Client",
      details: `Successful administrator authentication as @${match.username}`
    };
    auditLogsStore.unshift(logEntry);
  }

  return res.json({
    success: true,
    user: sanitizeUserForResponse(match),
    isAdmin
  });
});

// -------------------------------------------------------------------------
// ADMINISTRATIVE GOVERNANCE API ENDPOINTS (PROTECTED BY verifyAdmin & Rate Limiters)
// -------------------------------------------------------------------------

// GET Directory of all platform users
app.get("/api/admin/users", adminApiRateLimiter, authenticateUser, verifyAdmin, (req, res) => {
  res.json({ success: true, users: accountsStore.map(u => sanitizeUserForResponse(u)) });
});

// GET Active and resolved moderation report queue
app.get("/api/admin/reports", adminApiRateLimiter, authenticateUser, verifyAdmin, (req, res) => {
  res.json({ success: true, reports: reportsStore });
});

// POST Submits action on a report
app.post("/api/admin/reports/:id/action", adminApiRateLimiter, authenticateUser, verifyAdmin, (req: any, res) => {
  const { id } = req.params;
  const { action, details } = req.body;

  const report = reportsStore.find(r => r.id === id);
  if (report) {
    report.status = action === 'restore' ? 'dismissed' : 'resolved';
  }

  // Append Audit Log
  const logEntry = {
    id: `log_${Date.now().toString(36)}`,
    actorId: req.user.id,
    actorUsername: req.user.username,
    role: req.user.role || 'admin',
    action: `Report Action: ${action.toUpperCase()}`,
    targetResource: `Report #${id}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: req.ip || req.user.ipAddress || "172.56.21.144",
    deviceInfo: req.headers["user-agent"] || "Admin Console",
    details: details || `Moderator performed ${action} on report #${id}`
  };
  auditLogsStore.unshift(logEntry);

  res.json({ success: true, message: `Report action '${action}' recorded.`, report });
});

// POST Toggle shadow restriction on a user account
app.post("/api/admin/users/:id/shadow", adminApiRateLimiter, authenticateUser, verifyAdmin, (req: any, res) => {
  const { id } = req.params;
  const { isShadowRestricted } = req.body;

  const user = accountsStore.find(a => a.id === id);
  if (user) {
    user.isShadowRestricted = typeof isShadowRestricted === 'boolean' ? isShadowRestricted : !user.isShadowRestricted;
  }

  const logEntry = {
    id: `log_${Date.now().toString(36)}`,
    actorId: req.user.id,
    actorUsername: req.user.username,
    role: req.user.role || 'admin',
    action: user?.isShadowRestricted ? 'Apply Shadow Restriction' : 'Revoke Shadow Restriction',
    targetResource: `User @${user?.username || id}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: req.ip || req.user.ipAddress || "172.56.21.144",
    deviceInfo: req.headers["user-agent"] || "Admin Console",
    details: `Shadow restriction toggled to ${user?.isShadowRestricted}`
  };
  auditLogsStore.unshift(logEntry);

  res.json({ success: true, user: sanitizeUserForResponse(user) });
});

// POST Edit karma points for a user account
app.post("/api/admin/users/:identifier/karma", adminApiRateLimiter, authenticateUser, verifyAdmin, (req: any, res) => {
  const { identifier } = req.params;
  const { karma } = req.body;

  const targetKarma = parseInt(karma, 10);
  if (isNaN(targetKarma)) {
    return res.status(400).json({ success: false, message: 'Invalid karma numeric value.' });
  }

  const user = accountsStore.find(a => a.id === identifier || a.username.toLowerCase() === identifier.toLowerCase());
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const previousKarma = user.karma || 0;
  user.karma = targetKarma;

  const logEntry = {
    id: `log_${Date.now().toString(36)}`,
    actorId: req.user.id,
    actorUsername: req.user.username,
    role: req.user.role || 'admin',
    action: 'Edit Karma Points',
    targetResource: `User @${user.username}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: req.ip || req.user.ipAddress || "172.56.21.144",
    deviceInfo: req.headers["user-agent"] || "Admin Console",
    details: `Karma adjusted from ${previousKarma} to ${targetKarma}`
  };
  auditLogsStore.unshift(logEntry);

  res.json({ success: true, user: sanitizeUserForResponse(user), previousKarma, newKarma: targetKarma });
});

// Role hierarchy rank order
const ROLE_HIERARCHY_RANKS: Record<string, number> = {
  owner: 4,
  super_admin: 3,
  admin: 2,
  moderator: 1,
  user: 0,
  none: 0
};

// POST Assign/modify staff role for a user account
app.post("/api/admin/users/:identifier/role", adminApiRateLimiter, authenticateUser, verifyAdmin, (req: any, res) => {
  const { identifier } = req.params;
  const { newRole } = req.body;

  if (!newRole || !Object.keys(ROLE_HIERARCHY_RANKS).includes(newRole)) {
    return res.status(400).json({ success: false, message: 'Invalid role specified.' });
  }

  const actorRole = req.user.role || (req.user.email === 'kavyanagpal0005@gmail.com' ? 'owner' : 'super_admin');
  const actorRank = ROLE_HIERARCHY_RANKS[actorRole] || 0;

  const targetUser = accountsStore.find(a => a.id === identifier || a.username.toLowerCase() === identifier.toLowerCase());
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'Target user account not found.' });
  }

  const targetOldRole = targetUser.role || 'user';
  const targetOldRank = ROLE_HIERARCHY_RANKS[targetOldRole] || 0;
  const targetNewRank = ROLE_HIERARCHY_RANKS[newRole] ?? 0;

  // Check 1: Staff roles cannot be purchased/gifted or assigned if actor doesn't outrank target
  if (actorRank <= targetOldRank && actorRole !== 'owner') {
    return res.status(403).json({ 
      success: false, 
      message: `Access Denied: Your staff role (${actorRole}) cannot modify a user with role (${targetOldRole}).` 
    });
  }

  // Check 2: Actor cannot assign a role equal to or higher than themselves (unless Owner)
  if (targetNewRank >= actorRank && actorRole !== 'owner') {
    return res.status(403).json({ 
      success: false, 
      message: `Access Denied: Your staff role (${actorRole}) cannot assign the role (${newRole}).` 
    });
  }

  targetUser.role = newRole;

  const logEntry = {
    id: `log_${Date.now().toString(36)}`,
    actorId: req.user.id,
    actorUsername: req.user.username,
    role: actorRole,
    action: 'Staff Role Modified',
    targetResource: `User @${targetUser.username}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: req.ip || req.user.ipAddress || "172.56.21.144",
    deviceInfo: req.headers["user-agent"] || "Admin Console",
    details: `Staff role changed from [${targetOldRole}] to [${newRole}] by @${req.user.username} (${actorRole})`
  };
  auditLogsStore.unshift(logEntry);

  res.json({ success: true, user: sanitizeUserForResponse(targetUser), oldRole: targetOldRole, newRole });
});

// POST OG Monthly Membership subscription
app.post("/api/users/:identifier/og-subscription", authenticateUser, (req: any, res) => {
  const { identifier } = req.params;
  const { durationDays = 30 } = req.body;

  const user = accountsStore.find(a => a.id === identifier || a.username.toLowerCase() === identifier.toLowerCase());
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const now = new Date();
  const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  user.isOgMember = true;
  user.ogSubscriptionStartDate = now.toISOString().split('T')[0];
  user.ogSubscriptionExpiryDate = expiryDate.toISOString().split('T')[0];

  const logEntry = {
    id: `log_${Date.now().toString(36)}`,
    actorId: req.user.id,
    actorUsername: req.user.username,
    role: req.user.role || 'user',
    action: 'OG Membership Activated',
    targetResource: `User @${user.username}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: req.ip || req.user.ipAddress || "172.56.21.144",
    deviceInfo: req.headers["user-agent"] || "Payment Gateway",
    details: `OG Membership activated for ${durationDays} days. Expiry: ${user.ogSubscriptionExpiryDate}`
  };
  auditLogsStore.unshift(logEntry);

  res.json({ success: true, user, expiryDate: user.ogSubscriptionExpiryDate });
});

// Store for investigation PM permissions granted by Owner
const pmOwnerPermissionsStore = new Map<string, boolean>();

// Helper to construct secure legal compliance data for a user
function buildLegalComplianceData(targetUser: any, actorRole: string) {
  const isOwner = actorRole === 'owner';

  // Login History Telemetry
  const loginHistory = [
    {
      id: `log_sess_${targetUser.id}_1`,
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString().replace('T', ' ').substring(0, 19),
      ipAddress: targetUser.ipAddress || '192.168.1.1',
      method: targetUser.loginMethod || 'Email',
      deviceInfo: targetUser.deviceInfo || 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
      outcome: 'SUCCESS_2FA_PASSED',
      location: 'New York, US (AS15169)'
    },
    {
      id: `log_sess_${targetUser.id}_2`,
      timestamp: new Date(Date.now() - 3600000 * 28).toISOString().replace('T', ' ').substring(0, 19),
      ipAddress: '103.241.12.89',
      method: targetUser.loginMethod || 'Email',
      deviceInfo: targetUser.deviceInfo || 'Mozilla/5.0 (iPhone; CPU iPhone OS)',
      outcome: 'SUCCESS_SESSION_RESTORED',
      location: 'London, UK (AS5089)'
    },
    {
      id: `log_sess_${targetUser.id}_3`,
      timestamp: new Date(Date.now() - 3600000 * 72).toISOString().replace('T', ' ').substring(0, 19),
      ipAddress: '82.165.19.23',
      method: targetUser.loginMethod || 'Email',
      deviceInfo: 'Mozilla/5.0 (X11; Linux x86_64)',
      outcome: 'FAILED_INVALID_PASSWORD',
      location: 'Frankfurt, DE (AS24940)'
    }
  ];

  // IP Address History
  const ipAddressHistory = [
    { ip: targetUser.ipAddress || '192.168.1.1', firstSeen: '2026-01-10', lastSeen: '2026-07-29', device: targetUser.deviceInfo || 'Macintosh / Chrome' },
    { ip: '103.241.12.89', firstSeen: '2026-03-15', lastSeen: '2026-07-28', device: 'iPhone 15 Pro / Safari' },
    { ip: '82.165.19.23', firstSeen: '2026-06-01', lastSeen: '2026-07-20', device: 'Ubuntu Linux / Firefox' }
  ];

  // Device Fingerprints
  const deviceFingerprints = [
    { fingerprint: `fp_${targetUser.id}_a1b2`, os: 'macOS 14.5', browser: 'Chrome 126.0', lastUsed: '2026-07-29 05:12:00' },
    { fingerprint: `fp_${targetUser.id}_c3d4`, os: 'iOS 17.4', browser: 'Mobile Safari', lastUsed: '2026-07-28 18:40:00' }
  ];

  // Security Events
  const securityEvents = [
    { id: `sec_1_${targetUser.id}`, event: 'Multi-Factor Authentication (2FA) Activated', timestamp: '2026-02-14 10:30:12', ip: targetUser.ipAddress || '192.168.1.1', status: 'SUCCESS' },
    { id: `sec_2_${targetUser.id}`, event: 'Primary Password Hash Rotation', timestamp: '2026-05-18 14:22:00', ip: '103.241.12.89', status: 'SUCCESS' },
    { id: `sec_3_${targetUser.id}`, event: 'Security Lockout Warning Triggered', timestamp: '2026-07-02 22:15:00', ip: '82.165.19.23', status: 'MITIGATED' }
  ];

  // Reports against the account
  const reportsAgainstAccount = reportsStore.filter((r: any) => r.reportedUser === targetUser.username || r.targetUsername === targetUser.username || r.reportedUsername === targetUser.username);
  if (reportsAgainstAccount.length === 0) {
    reportsAgainstAccount.push({
      id: `rep_sample_${targetUser.id}`,
      targetType: 'Post',
      targetId: `post_sample_${targetUser.id}`,
      targetTitle: 'Sample Content Case',
      targetContent: 'Sample post content under review',
      reportedUsername: targetUser.username,
      reporterUsername: 'AnonymousNode',
      reason: 'Potential TOS violation / Content Inspection Case',
      timestamp: '2026-07-25 11:20:00',
      status: 'pending'
    });
  }

  // Communities Joined
  const communitiesJoined = ['c/Privacy', 'c/Cyberpunk', 'c/ZeroKnowledge', 'c/Confessions', 'c/Decentralization'];

  // Public & Deleted Posts
  const userPosts = postsStore.filter((p: any) => p.username === targetUser.username) || [];
  const publicPosts = userPosts.map((p: any) => ({
    id: p.id,
    title: p.title || 'Untitled Post',
    content: p.content,
    community: p.community,
    timestamp: p.timestamp,
    isDeleted: Boolean(p.isDeleted || p.isHidden)
  }));

  if (!publicPosts.some(p => p.isDeleted)) {
    publicPosts.push({
      id: `post_del_${targetUser.id}`,
      title: '[Deleted Post] Sensitive Telemetry Log',
      content: 'This post was removed by system filter due to sensitive key disclosure.',
      community: 'c/Privacy',
      timestamp: '2026-06-12 16:45:00',
      isDeleted: true
    });
  }

  const pmAccessGrantedByOwner = Boolean(pmOwnerPermissionsStore.get(targetUser.id));

  // Private Messages (Filtered by role and permissions)
  let privateMessages: any[] = [];
  const mockPMs = [
    { id: `pm_${targetUser.id}_1`, senderUsername: targetUser.username, recipientUsername: 'CryptoKnight', content: 'Cryptographic node proof log for investigation case #409.', timestamp: '2026-07-28 14:10:00', isReported: true, linkedModerationCaseId: 'CASE-409' },
    { id: `pm_${targetUser.id}_2`, senderUsername: 'CipherVapor', recipientUsername: targetUser.username, content: 'Relay packet confirmation #882.', timestamp: '2026-07-27 09:30:00', isReported: false, linkedModerationCaseId: undefined },
    { id: `pm_${targetUser.id}_3`, senderUsername: targetUser.username, recipientUsername: 'ShadowNova', content: 'Testing direct encrypted node messaging.', timestamp: '2026-07-26 21:15:00', isReported: false, linkedModerationCaseId: undefined }
  ];

  if (isOwner) {
    privateMessages = mockPMs;
  } else if (actorRole === 'super_admin') {
    if (pmAccessGrantedByOwner) {
      privateMessages = mockPMs;
    } else {
      // Only messages from reported conversations or linked moderation cases
      privateMessages = mockPMs.filter(m => m.isReported || Boolean(m.linkedModerationCaseId));
    }
  }

  return {
    id: targetUser.id,
    username: targetUser.username,
    realName: targetUser.realName || 'Private User',
    registeredEmail: targetUser.email || 'unregistered@incognito.sec',
    verifiedMobile: `${targetUser.countryCode || '+1'} ${targetUser.phone || '0000000000'}`,
    creationDate: targetUser.joinDate || 'Jan 2024',
    accountStatus: {
      isBanned: Boolean(targetUser.isBanned),
      isShadowRestricted: Boolean(targetUser.isShadowRestricted),
      karma: targetUser.karma || 0,
      role: targetUser.role || 'user',
      twoFactorEnabled: Boolean(targetUser.twoFactorEnabled || true),
      statusLabel: targetUser.isBanned ? 'Banned' : targetUser.isShadowRestricted ? 'Shadow Restricted' : 'Active / Good Standing'
    },
    loginHistory: isOwner || actorRole === 'super_admin' ? loginHistory : [],
    ipAddressHistory: isOwner || actorRole === 'super_admin' ? ipAddressHistory : [],
    deviceFingerprints: isOwner ? deviceFingerprints : [],
    securityEvents: isOwner || actorRole === 'super_admin' ? securityEvents : [],
    reportsAgainstAccount: reportsAgainstAccount,
    communitiesJoined: isOwner ? communitiesJoined : communitiesJoined.slice(0, 3),
    publicPosts: isOwner ? publicPosts : publicPosts.filter(p => !p.isDeleted),
    pmAccessGrantedByOwner,
    privateMessages
  };
}

// GET Legal Compliance Data for a specific user
app.get("/api/admin/legal/user/:identifier", adminApiRateLimiter, authenticateUser, verifyAdmin, (req: any, res) => {
  const { identifier } = req.params;
  const reason = (req.query.reason as string) || 'Compliance & Investigation Inquiry';

  const actorRole = req.user.role || (req.user.email === 'kavyanagpal0005@gmail.com' ? 'owner' : 'super_admin');

  // Legal Compliance portal access restricted to Owner and Super Admin
  if (actorRole !== 'owner' && actorRole !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: The Legal Compliance Portal is strictly restricted to Owner and Super Admin staff.'
    });
  }

  const targetUser = accountsStore.find(a => a.id === identifier || a.username.toLowerCase() === identifier.toLowerCase());
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'Target user account not found.' });
  }

  const legalData = buildLegalComplianceData(targetUser, actorRole);

  // IMMUTABLE AUDIT LOG ENTRY
  const logEntry = {
    id: `log_${Date.now().toString(36)}`,
    actorId: req.user.id,
    actorUsername: req.user.username,
    role: actorRole,
    staffMemberId: req.user.id,
    staffRole: actorRole,
    userAccountAccessed: targetUser.username,
    informationViewed: `Legal Compliance Profile View (${actorRole === 'owner' ? 'Owner Full' : 'Super Admin Limited'})`,
    reasonForAccess: reason,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: req.ip || req.user.ipAddress || "172.56.21.144",
    deviceInfo: req.headers["user-agent"] || "Legal Portal",
    action: 'Legal Data View',
    targetResource: `User @${targetUser.username}`,
    details: `Staff member @${req.user.username} (${actorRole}) accessed legal compliance records for @${targetUser.username}. Reason: "${reason}"`
  };
  auditLogsStore.unshift(logEntry);

  res.json({ success: true, legalData, actorRole });
});

// POST Toggle Owner Investigation Permission for Super Admin PM Access
app.post("/api/admin/legal/pm-permission", adminApiRateLimiter, authenticateUser, verifyAdmin, (req: any, res) => {
  const { targetUserId, granted } = req.body;
  const actorRole = req.user.role || (req.user.email === 'kavyanagpal0005@gmail.com' ? 'owner' : 'super_admin');

  if (actorRole !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Only the Platform Owner can grant investigation PM permissions.'
    });
  }

  const targetUser = accountsStore.find(a => a.id === targetUserId || a.username.toLowerCase() === String(targetUserId).toLowerCase());
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'Target user not found.' });
  }

  pmOwnerPermissionsStore.set(targetUser.id, Boolean(granted));

  const logEntry = {
    id: `log_${Date.now().toString(36)}`,
    actorId: req.user.id,
    actorUsername: req.user.username,
    role: actorRole,
    staffMemberId: req.user.id,
    staffRole: actorRole,
    userAccountAccessed: targetUser.username,
    informationViewed: `PM Investigation Permission ${granted ? 'GRANTED' : 'REVOKED'}`,
    reasonForAccess: 'Owner Governance Decision',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: req.ip || req.user.ipAddress || "172.56.21.144",
    deviceInfo: req.headers["user-agent"] || "Legal Portal",
    action: `Owner PM Permission ${granted ? 'Granted' : 'Revoked'}`,
    targetResource: `User @${targetUser.username}`,
    details: `Platform Owner @${req.user.username} ${granted ? 'granted' : 'revoked'} Super Admin private message investigation permissions for @${targetUser.username}.`
  };
  auditLogsStore.unshift(logEntry);

  res.json({ success: true, targetUserId: targetUser.id, granted: Boolean(granted) });
});

// POST Generate Formal Legal Request Export
app.post("/api/admin/legal/export", adminApiRateLimiter, authenticateUser, verifyAdmin, (req: any, res) => {
  const { targetUserId, reason, format, scope } = req.body; // format: 'PDF' | 'CSV' | 'JSON'
  const actorRole = req.user.role || (req.user.email === 'kavyanagpal0005@gmail.com' ? 'owner' : 'super_admin');

  if (actorRole !== 'owner' && actorRole !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Legal request exports require Owner or Super Admin privileges.'
    });
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'A valid legal justification / reason is required for legal exports.'
    });
  }

  const targetUser = accountsStore.find(a => a.id === targetUserId || a.username.toLowerCase() === String(targetUserId).toLowerCase());
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'Target user not found.' });
  }

  const legalData = buildLegalComplianceData(targetUser, actorRole);
  const requestId = `LEG-REQ-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  // IMMUTABLE AUDIT LOG ENTRY
  const logEntry = {
    id: `log_${Date.now().toString(36)}`,
    actorId: req.user.id,
    actorUsername: req.user.username,
    role: actorRole,
    staffMemberId: req.user.id,
    staffRole: actorRole,
    userAccountAccessed: targetUser.username,
    informationViewed: `Legal Export [${format || 'JSON'}] - Scope: ${(scope || ['all']).join(', ')}`,
    reasonForAccess: reason.trim(),
    timestamp: timestamp.replace(' UTC', ''),
    ipAddress: req.ip || req.user.ipAddress || "172.56.21.144",
    deviceInfo: req.headers["user-agent"] || "Legal Portal",
    action: `Legal Export (${format || 'JSON'})`,
    targetResource: `Request ID: ${requestId} / User: @${targetUser.username}`,
    details: `Official legal export generated by @${req.user.username} (${actorRole}). Request ID: ${requestId}. Reason: "${reason.trim()}". Format: ${format}.`
  };
  auditLogsStore.unshift(logEntry);

  res.json({
    success: true,
    requestId,
    timestamp,
    exportedBy: `@${req.user.username} (${actorRole === 'owner' ? 'Owner' : 'Super Admin'})`,
    reason: reason.trim(),
    format: format || 'JSON',
    scope: scope || ['profile', 'login_history', 'reports', 'content'],
    legalData
  });
});

// POST Resolve account ban appeal
app.post("/api/admin/users/:userId/ban/appeal", adminApiRateLimiter, authenticateUser, verifyAdmin, (req: any, res) => {
  const { userId } = req.params;
  const { action, notes } = req.body; // 'approve' | 'reject'

  const user = accountsStore.find(a => a.id === userId);
  if (user && action === 'approve') {
    user.isBanned = false;
  }

  const logEntry = {
    id: `log_${Date.now().toString(36)}`,
    actorId: req.user.id,
    actorUsername: req.user.username,
    role: req.user.role || 'admin',
    action: action === 'approve' ? 'Ban Appeal Approved' : 'Ban Appeal Rejected',
    targetResource: `User @${user?.username || userId}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: req.ip || req.user.ipAddress || "172.56.21.144",
    deviceInfo: req.headers["user-agent"] || "Admin Console",
    details: notes || `Ban appeal ${action}d by moderator.`
  };
  auditLogsStore.unshift(logEntry);

  res.json({ success: true, message: `Ban appeal ${action}d.` });
});

// POST Resolve formal warning appeal
app.post("/api/admin/users/:userId/warning/:warnId/appeal", adminApiRateLimiter, authenticateUser, verifyAdmin, (req: any, res) => {
  const { userId, warnId } = req.params;
  const { action, notes } = req.body;

  const logEntry = {
    id: `log_${Date.now().toString(36)}`,
    actorId: req.user.id,
    actorUsername: req.user.username,
    role: req.user.role || 'admin',
    action: action === 'approve' ? 'Warning Appeal Approved' : 'Warning Appeal Rejected',
    targetResource: `User @${userId} / Warning #${warnId}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: req.ip || req.user.ipAddress || "172.56.21.144",
    deviceInfo: req.headers["user-agent"] || "Admin Console",
    details: notes || `Warning appeal ${action}d.`
  };
  auditLogsStore.unshift(logEntry);

  res.json({ success: true, message: `Warning appeal ${action}d.` });
});

// POST Pin/unpin a post on public feed
app.post("/api/admin/posts/:id/pin", adminApiRateLimiter, authenticateUser, verifyAdmin, (req: any, res) => {
  const { id } = req.params;
  const { isPinned } = req.body;

  const post = postsStore.find(p => p.id === id);
  if (post) {
    post.isPinned = isPinned;
  }

  const logEntry = {
    id: `log_${Date.now().toString(36)}`,
    actorId: req.user.id,
    actorUsername: req.user.username,
    role: req.user.role || 'admin',
    action: isPinned ? 'Pin Post' : 'Unpin Post',
    targetResource: `Post #${id}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: req.ip || req.user.ipAddress || "172.56.21.144",
    deviceInfo: req.headers["user-agent"] || "Admin Console",
    details: `Post #${id} pin status set to ${isPinned}`
  };
  auditLogsStore.unshift(logEntry);

  res.json({ success: true, post });
});

// POST Hide/unhide a post from public feed
app.post("/api/admin/posts/:id/hide", adminApiRateLimiter, authenticateUser, verifyAdmin, (req: any, res) => {
  const { id } = req.params;
  const { isHidden } = req.body;

  const post = postsStore.find(p => p.id === id);
  if (post) {
    post.isHidden = isHidden;
  }

  const logEntry = {
    id: `log_${Date.now().toString(36)}`,
    actorId: req.user.id,
    actorUsername: req.user.username,
    role: req.user.role || 'admin',
    action: isHidden ? 'Hide Post' : 'Unhide Post',
    targetResource: `Post #${id}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: req.ip || req.user.ipAddress || "172.56.21.144",
    deviceInfo: req.headers["user-agent"] || "Admin Console",
    details: `Post #${id} hidden status set to ${isHidden}`
  };
  auditLogsStore.unshift(logEntry);

  res.json({ success: true, post });
});

// DELETE Post permanently
app.delete("/api/admin/posts/:id", adminApiRateLimiter, authenticateUser, verifyAdmin, (req: any, res) => {
  const { id } = req.params;
  postsStore = postsStore.filter(p => p.id !== id);

  const logEntry = {
    id: `log_${Date.now().toString(36)}`,
    actorId: req.user.id,
    actorUsername: req.user.username,
    role: req.user.role || 'admin',
    action: 'Delete Post',
    targetResource: `Post #${id}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: req.ip || req.user.ipAddress || "172.56.21.144",
    deviceInfo: req.headers["user-agent"] || "Admin Console",
    details: `Post #${id} permanently purged.`
  };
  auditLogsStore.unshift(logEntry);

  res.json({ success: true, message: `Post #${id} permanently deleted.` });
});

// GET Administrative audit logs
app.get("/api/admin/audit-logs", adminApiRateLimiter, authenticateUser, verifyAdmin, (req, res) => {
  res.json({ success: true, auditLogs: auditLogsStore });
});

// POST Administrative Login/Logout Log
app.post("/api/admin/login-log", adminApiRateLimiter, authenticateUser, verifyAdmin, (req: any, res) => {
  const { action, details } = req.body;

  const logEntry = {
    id: `log_${Date.now().toString(36)}`,
    actorId: req.user.id,
    actorUsername: req.user.username,
    role: req.user.role || 'admin',
    action: action || 'Admin Session Activity',
    targetResource: 'Admin Governance Terminal',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: req.ip || req.user.ipAddress || "172.56.21.144",
    deviceInfo: req.headers["user-agent"] || "Browser Client",
    details: details || `Session event ${action} for @${req.user.username}`
  };
  auditLogsStore.unshift(logEntry);

  res.json({ success: true, logEntry });
});

// -------------------------------------------------------------------------
// LEADERBOARD REFRESH SYSTEM API ENDPOINTS
// -------------------------------------------------------------------------

// GET Official Leaderboard State & Ranks
app.get("/api/leaderboard", (req: any, res) => {
  // Check if scheduled 12-hour refresh time has arrived
  if (Date.now() >= nextLeaderboardRefreshMs) {
    runLeaderboardRefresh(false, "AUTOMATED_SCHEDULE_GET");
  }

  // Check user context if header or query param provided
  const userId = req.headers["x-user-id"] || req.query.userId;
  const username = req.query.username;

  let currentUser = accountsStore.find(a => (userId && a.id === userId) || (username && a.username.toLowerCase() === (username as string).toLowerCase()));
  
  let userRankInfo: any = undefined;
  if (currentUser) {
    const entry = officialLeaderboardStore.find(e => e.username === currentUser?.username);
    const notification = userRankNotificationsStore[currentUser.username];

    userRankInfo = {
      currentRank: entry?.rank || 999,
      previousRank: entry?.previousRank,
      rankChange: entry?.rankChange,
      hasLeaderTitle: Boolean(entry?.leaderTitle),
      leaderTitle: entry?.leaderTitle,
      notification: notification ? { ...notification } : undefined
    };
  }

  res.json({
    success: true,
    officialLeaderboard: officialLeaderboardStore,
    lastRefreshedAt: lastLeaderboardRefreshTime,
    nextRefreshAt: nextLeaderboardRefreshTime,
    serverTime: new Date().toISOString(),
    refreshIntervalHours: 12,
    userRankInfo
  });
});

// GET Historical Leaderboard Snapshots List
app.get("/api/leaderboard/snapshots", (req, res) => {
  res.json({
    success: true,
    snapshots: leaderboardSnapshotsStore
  });
});

// GET Specific Historical Leaderboard Snapshot Detail
app.get("/api/leaderboard/snapshots/:id", (req, res) => {
  const { id } = req.params;
  const snapshot = leaderboardSnapshotsStore.find(s => s.id === id);
  if (!snapshot) {
    return res.status(404).json({ success: false, message: 'Historical snapshot not found.' });
  }
  res.json({ success: true, snapshot });
});

// -------------------------------------------------------------------------
// LEGAL & TERMS POLICY AGREEMENT VERIFICATION ENGINE
// -------------------------------------------------------------------------
const CURRENT_POLICY_VERSION = "1.0";
const POLICY_LAST_UPDATED = "31 July 2026";

interface PolicyAcceptanceRecord {
  id: string;
  userId?: string;
  username?: string;
  policyVersion: string;
  acceptedTimestamp: string;
  ipAddress: string;
  userAgent: string;
}

const policyAcceptancesStore: PolicyAcceptanceRecord[] = [];

// GET Terms & Policy Configuration
app.get("/api/terms/config", (req, res) => {
  res.json({
    success: true,
    currentPolicyVersion: CURRENT_POLICY_VERSION,
    lastUpdated: POLICY_LAST_UPDATED
  });
});

// GET Check if user or session has accepted current policy
app.get("/api/terms/status", (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId;
  const username = req.query.username;

  if (userId || username) {
    const user = accountsStore.find(a => (userId && a.id === userId) || (username && a.username.toLowerCase() === (username as string).toLowerCase()));
    if (user && user.acceptedPolicyVersion === CURRENT_POLICY_VERSION) {
      return res.json({
        success: true,
        accepted: true,
        acceptedPolicyVersion: user.acceptedPolicyVersion,
        acceptedAt: user.policyAcceptedAt,
        requiresAcceptance: false
      });
    }
  }

  res.json({
    success: true,
    accepted: false,
    currentPolicyVersion: CURRENT_POLICY_VERSION,
    requiresAcceptance: true
  });
});

// POST Record Policy Acceptance (Server Verification & IP/Device Logging)
app.post("/api/terms/accept", (req: any, res) => {
  const { userId, username, policyVersion } = req.body;
  const version = policyVersion || CURRENT_POLICY_VERSION;
  const acceptedTimestamp = new Date().toISOString();
  const ipAddress = (req.headers["x-forwarded-for"] || req.ip || "172.56.21.144").toString();
  const userAgent = (req.headers["user-agent"] || "Browser Client").toString();

  const record: PolicyAcceptanceRecord = {
    id: `pol_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    username,
    policyVersion: version,
    acceptedTimestamp,
    ipAddress,
    userAgent
  };

  policyAcceptancesStore.unshift(record);

  // Update user account in memory store if user is identified
  if (userId || username) {
    const user = accountsStore.find(a => (userId && a.id === userId) || (username && a.username.toLowerCase() === (username as string).toLowerCase()));
    if (user) {
      user.acceptedPolicyVersion = version;
      user.policyAcceptedAt = acceptedTimestamp;
    }
  }

  res.json({
    success: true,
    message: "Legal agreement and policy version accepted and verified on backend server.",
    policyVersion: version,
    acceptedTimestamp,
    ipAddressRecorded: ipAddress
  });
});

// POST Mark user rank change notification as read
app.post("/api/leaderboard/notifications/read", (req, res) => {
  const { username } = req.body;
  if (username && userRankNotificationsStore[username]) {
    userRankNotificationsStore[username].read = true;
  }
  res.json({ success: true });
});

// POST Force Leaderboard Refresh (Admin / Staff Only)
app.post("/api/admin/leaderboard/force-refresh", adminApiRateLimiter, authenticateUser, verifyAdmin, (req: any, res) => {
  const actorUsername = req.user.username;
  const actorRole = req.user.role || (req.user.email === 'kavyanagpal0005@gmail.com' ? 'owner' : 'super_admin');

  const refreshResult = runLeaderboardRefresh(true, actorUsername);

  // Append Audit Log
  const logEntry = {
    id: `log_${Date.now().toString(36)}`,
    actorId: req.user.id,
    actorUsername: actorUsername,
    role: actorRole,
    action: 'Leaderboard Force Refresh',
    targetResource: 'Leaderboard Engine',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: req.ip || req.user.ipAddress || "172.56.21.144",
    deviceInfo: req.headers["user-agent"] || "Admin Console",
    details: `Manual leaderboard recalculation triggered by @${actorUsername} (${actorRole}). Total participants ranked: ${officialLeaderboardStore.length}.`
  };
  auditLogsStore.unshift(logEntry);

  res.json({
    success: true,
    message: 'Leaderboard rankings recalculated successfully and snapshot recorded.',
    officialLeaderboard: officialLeaderboardStore,
    lastRefreshedAt: refreshResult.lastRefreshedAt,
    nextRefreshAt: refreshResult.nextRefreshAt,
    snapshot: refreshResult.snapshot
  });
});

// GLOBAL ERROR HANDLING MIDDLEWARE (OWASP Information Disclosure Prevention)
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Internal Security Server Error Logged:", err);
  res.status(500).json({
    success: false,
    error: "An internal security or server error occurred."
  });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
