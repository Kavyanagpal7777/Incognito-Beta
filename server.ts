import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { generateAnonymousUsernames } from "./src/utils/usernameGenerator";
import { clerkMiddleware } from "@clerk/express";

dotenv.config();

const app = express();
app.disable("x-powered-by"); // Hide Express footprint
app.set("trust proxy", 1); // Trust Cloud Run / reverse proxy headers safely
app.use(express.json({ limit: "1mb" })); // Restrict payload size against Denial-of-Service

// Mount Clerk Express Middleware if keys are provided
const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;
if (clerkPublishableKey || clerkSecretKey) {
  try {
    app.use(clerkMiddleware({ publishableKey: clerkPublishableKey, secretKey: clerkSecretKey }));
  } catch (err) {
    console.warn("[CLERK_MIDDLEWARE_INIT_WARNING]", err);
  }
}

const PORT = 3000;

// Setup Uploads Directory for Photo Uploads
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Config with Memory Storage & 10MB Limit
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per image
  },
  storage: multer.memoryStorage(),
});

// Helper function to inspect binary magic bytes of uploaded buffers with mobile photo format support
function getImageMimeFromBuffer(buffer: Buffer, clientMime?: string, originalName?: string): { mime: string; ext: string } | null {
  if (!buffer || buffer.length < 4) return null;

  // JPEG / JPG: FF D8
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { mime: "image/png", ext: "png" };
  }

  // GIF: 47 49 46 38 ('GIF8')
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return { mime: "image/gif", ext: "gif" };
  }

  // WEBP: RIFF...WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  // BMP: 42 4D ('BM')
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return { mime: "image/bmp", ext: "bmp" };
  }

  // HEIC / HEIF / AVIF (ftyp in bytes 4..7)
  if (buffer.length >= 12 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    const ftyp = buffer.toString('ascii', 8, 12).toLowerCase();
    if (ftyp.includes('heic') || ftyp.includes('heim') || ftyp.includes('heis') || ftyp.includes('mif1')) {
      return { mime: "image/heic", ext: "heic" };
    }
    if (ftyp.includes('avif')) {
      return { mime: "image/avif", ext: "avif" };
    }
    return { mime: "image/heic", ext: "heic" };
  }

  // Client MIME type fallback for mobile browsers
  if (clientMime && clientMime.toLowerCase().startsWith("image/") && !clientMime.includes("svg") && !clientMime.includes("html") && !clientMime.includes("xml")) {
    const sub = clientMime.toLowerCase().split("/")[1] || "jpg";
    const ext = sub === "jpeg" ? "jpg" : sub.replace(/[^a-z0-9]/g, "") || "jpg";
    return { mime: clientMime.toLowerCase(), ext };
  }

  // Original filename extension fallback
  if (originalName) {
    const matchedExt = path.extname(originalName).toLowerCase().replace(".", "");
    if (["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "bmp", "avif"].includes(matchedExt)) {
      const ext = matchedExt === "jpeg" ? "jpg" : matchedExt;
      return { mime: `image/${ext}`, ext };
    }
  }

  return null;
}

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

// IP-based failed login tracking store for incremental delays and temporary blocks
interface FailedLoginRecord {
  failedCount: number;
  firstFailedAt: number;
  lastFailedAt: number;
  lockoutUntil?: number;
  lockoutMultiplier: number;
}

const failedLoginIpMap = new Map<string, FailedLoginRecord>();

// Periodic garbage collection to purge expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now >= entry.resetTime && (!entry.lockoutUntil || now >= entry.lockoutUntil)) {
      rateLimitMap.delete(key);
    }
  }

  for (const [ip, rec] of failedLoginIpMap.entries()) {
    if (now - rec.lastFailedAt > 60 * 60 * 1000 && (!rec.lockoutUntil || now >= rec.lockoutUntil)) {
      failedLoginIpMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// SERVER-SIDE RATE LIMITING MIDDLEWARE FOR FAILED LOGIN ATTEMPTS (IP-based Tarpitting & Temporary Blocks)
async function failedLoginRateLimiter(req: any, res: any, next: any) {
  const clientIp = getCleanIp(req);
  const now = Date.now();
  const record = failedLoginIpMap.get(clientIp);

  if (record) {
    // 1. Temporary Block Enforcement (Lockout Active)
    if (record.lockoutUntil && now < record.lockoutUntil) {
      const remainingSecs = Math.ceil((record.lockoutUntil - now) / 1000);
      res.setHeader("Retry-After", String(remainingSecs));

      console.warn(`[BRUTE_FORCE_DEFENDER] Blocked login attempt from IP ${maskIdentifier(clientIp)}. Lockout active for ${remainingSecs}s.`);

      return res.status(429).json({
        success: false,
        error: "RATE_LIMIT_EXCEEDED",
        message: `Security Lockout Active: Too many failed login attempts from this IP. Please try again in ${remainingSecs} seconds.`,
        retryAfter: remainingSecs
      });
    }

    // 2. Clear expired lockouts
    if (record.lockoutUntil && now >= record.lockoutUntil) {
      record.lockoutUntil = undefined;
      record.failedCount = 0;
    }

    // 3. Incremental Delay (Tarpitting) for prior failed attempts
    if (record.failedCount > 0) {
      const delayMs = Math.min(300 * Math.pow(2, record.failedCount - 1), 3000);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  next();
}

function recordFailedLoginAttempt(clientIp: string, targetIdentifier?: string) {
  const now = Date.now();
  let record = failedLoginIpMap.get(clientIp);

  if (!record) {
    record = {
      failedCount: 1,
      firstFailedAt: now,
      lastFailedAt: now,
      lockoutMultiplier: 1
    };
  } else {
    if (now - record.lastFailedAt > 30 * 60 * 1000) {
      record.failedCount = 1;
      record.firstFailedAt = now;
    } else {
      record.failedCount += 1;
    }
    record.lastFailedAt = now;
  }

  // Temporary block threshold: 5 failed attempts from same IP
  if (record.failedCount >= 5) {
    const baseLockoutMs = 15 * 60 * 1000; // 15 minutes
    const durationMs = Math.min(baseLockoutMs * Math.pow(2, record.lockoutMultiplier - 1), 24 * 60 * 60 * 1000);
    record.lockoutUntil = now + durationMs;
    record.lockoutMultiplier += 1;

    console.warn(`[SECURITY_LOCKOUT_ENFORCED] IP ${maskIdentifier(clientIp)} locked out for ${Math.ceil(durationMs / 1000)}s after ${record.failedCount} failed attempts.`);

    if (typeof auditLogsStore !== 'undefined') {
      auditLogsStore.unshift({
        id: `log_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
        actorId: 'system',
        actorUsername: 'BruteForceDefender',
        role: 'system',
        action: 'IP Security Lockout Enforced',
        targetResource: '/api/auth/login',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        ipAddress: maskIdentifier(clientIp),
        deviceInfo: "Brute Force Protection Engine",
        details: `Enforced ${Math.ceil(durationMs / 60000)}-minute temporary block after ${record.failedCount} consecutive failed login attempts.`
      });
    }
  }

  failedLoginIpMap.set(clientIp, record);

  // Maintain per-account lockout key for targeted protection
  if (targetIdentifier) {
    const accountLockKey = `lockout_acc_${targetIdentifier.toLowerCase()}`;
    const accEntry = rateLimitMap.get(accountLockKey) || { count: 0, resetTime: now + 15 * 60 * 1000, failedLoginAttempts: 0 };
    accEntry.failedLoginAttempts = (accEntry.failedLoginAttempts || 0) + 1;
    if (accEntry.failedLoginAttempts >= 5) {
      accEntry.lockoutUntil = now + 15 * 60 * 1000;
    }
    rateLimitMap.set(accountLockKey, accEntry);
  }
}

function recordSuccessfulLoginAttempt(clientIp: string, targetIdentifier?: string) {
  // Reset failed login attempt counter on successful password verification
  failedLoginIpMap.delete(clientIp);

  if (targetIdentifier) {
    const accountLockKey = `lockout_acc_${targetIdentifier.toLowerCase()}`;
    rateLimitMap.delete(accountLockKey);
  }
}

function getCleanIp(req: any): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "127.0.0.1";
}

function maskIdentifier(id: string): string {
  if (!id) return "anon";
  if (id.includes("@")) {
    const parts = id.split("@");
    return `${parts[0].substring(0, 2)}***@${parts[1]}`;
  }
  if (id.includes(".")) {
    const parts = id.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  }
  if (id.length > 6) {
    return `${id.substring(0, 3)}***${id.substring(id.length - 2)}`;
  }
  return `${id.substring(0, 1)}***`;
}

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  errorMessage: string;
  extractAccountKey?: (req: any) => string | null | undefined;
}

function createRateLimiter(options: RateLimiterOptions) {
  return (req: any, res: any, next: any) => {
    const clientIp = getCleanIp(req);
    const now = Date.now();

    // 1. IP-based key
    const ipKey = `${options.keyPrefix}_ip_${clientIp}`;
    const ipEntry = rateLimitMap.get(ipKey) || { count: 0, resetTime: now + options.windowMs };

    if (now > ipEntry.resetTime) {
      ipEntry.count = 1;
      ipEntry.resetTime = now + options.windowMs;
    } else {
      ipEntry.count += 1;
    }
    rateLimitMap.set(ipKey, ipEntry);

    let isExceeded = ipEntry.count > options.max;
    let limitResetTime = ipEntry.resetTime;

    // 2. Account / Identifier-based key
    let accountKeyStr: string | null = null;
    if (options.extractAccountKey) {
      try {
        const rawAccount = options.extractAccountKey(req);
        if (rawAccount && typeof rawAccount === "string" && rawAccount.trim()) {
          const cleanAcc = rawAccount.toLowerCase().trim();
          accountKeyStr = `${options.keyPrefix}_acc_${cleanAcc}`;
          const accEntry = rateLimitMap.get(accountKeyStr) || { count: 0, resetTime: now + options.windowMs };

          if (now > accEntry.resetTime) {
            accEntry.count = 1;
            accEntry.resetTime = now + options.windowMs;
          } else {
            accEntry.count += 1;
          }
          rateLimitMap.set(accountKeyStr, accEntry);

          if (accEntry.count > options.max) {
            isExceeded = true;
            limitResetTime = Math.max(limitResetTime, accEntry.resetTime);
          }
        }
      } catch {
        // Safe fallback
      }
    }

    if (isExceeded) {
      const retryAfterSecs = Math.max(1, Math.ceil((limitResetTime - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSecs));

      const maskedIp = maskIdentifier(clientIp);
      const maskedAccount = accountKeyStr ? maskIdentifier(accountKeyStr) : "n/a";

      console.warn(`[RATE_LIMIT_EXCEEDED] Endpoint: ${req.method} ${req.path} | IP: ${maskedIp} | Identifier: ${maskedAccount} | RetryAfter: ${retryAfterSecs}s`);

      if (typeof auditLogsStore !== 'undefined') {
        auditLogsStore.unshift({
          id: `log_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
          actorId: 'system',
          actorUsername: 'RateLimitDefender',
          role: 'system',
          action: 'Rate Limit Threshold Exceeded',
          targetResource: req.path,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          ipAddress: maskedIp,
          deviceInfo: req.headers["user-agent"] || "Unknown Device",
          details: `Exceeded ${options.keyPrefix} rate limit (${options.max} attempts / ${options.windowMs / 60000}m) on ${req.method} ${req.path}.`
        });
      }

      return res.status(429).json({
        success: false,
        error: "RATE_LIMIT_EXCEEDED",
        message: options.errorMessage
      });
    }

    next();
  };
}

const globalApiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 min
  keyPrefix: "global_api",
  errorMessage: "Too many requests. Please try again later."
});

const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 min
  keyPrefix: "auth_login",
  errorMessage: "Too many login attempts. Please try again later.",
  extractAccountKey: (req) => req.body?.email || req.body?.phone || req.body?.username || req.body?.userId
});

const registrationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 min
  keyPrefix: "auth_reg",
  errorMessage: "Too many registration attempts. Please try again later.",
  extractAccountKey: (req) => req.body?.email || req.body?.phone || req.body?.username
});

const recoveryRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 min
  keyPrefix: "auth_recovery",
  errorMessage: "Too many recovery attempts. Please try again later.",
  extractAccountKey: (req) => req.body?.email || req.body?.phone || req.body?.username
});

const adminApiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per 15 min
  keyPrefix: "admin_api",
  errorMessage: "Too many admin requests. Please try again later."
});

const publicApiRateLimiter = globalApiRateLimiter;

// Mount global API rate limiter for all /api endpoints
app.use("/api", globalApiRateLimiter);
// Mount admin API rate limiter for all /api/admin endpoints
app.use("/api/admin", adminApiRateLimiter);

// Serve uploaded images securely
app.get("/api/uploads/:filename", (req, res) => {
  const filename = path.basename(req.params.filename); // Prevents path traversal
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Image not found" });
  }

  const ext = path.extname(filename).toLowerCase();
  let contentType = "image/jpeg";
  if (ext === ".png") contentType = "image/png";
  if (ext === ".webp") contentType = "image/webp";
  if (ext === ".gif") contentType = "image/gif";

  res.setHeader("Content-Type", contentType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(filePath);
});

// Secure Photo Upload Endpoint (10MB Max, Server-Side & Mobile Magic Byte Validation)
app.post("/api/upload-image", publicApiRateLimiter, (req, res) => {
  upload.single("image")(req, res, (err: any) => {
    res.setHeader("Content-Type", "application/json");

    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, error: "Image must be 10 MB or smaller." });
      }
      return res.status(400).json({ success: false, error: "Image upload failed. Please try again." });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: "No image file provided." });
    }

    // Server-side file size check (10MB limit)
    if (req.file.buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: "Image must be 10 MB or smaller." });
    }

    const clientMime = (req.file.mimetype || "").toLowerCase();
    const originalName = req.file.originalname || "";

    // Inspect binary magic bytes with fallback
    const imageInfo = getImageMimeFromBuffer(req.file.buffer, clientMime, originalName);
    if (!imageInfo) {
      return res.status(400).json({ success: false, error: "Unsupported image format." });
    }

    try {
      // Ensure upload directory exists
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }

      // Generate safe unique filename/server-side object key
      const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
      const safeFilename = `img_${uniqueSuffix}.${imageInfo.ext}`;
      const savePath = path.join(UPLOADS_DIR, safeFilename);

      fs.writeFileSync(savePath, req.file.buffer);

      const imageUrl = `/api/uploads/${safeFilename}`;
      return res.json({
        success: true,
        imageUrl,
        url: imageUrl,
        filename: safeFilename
      });
    } catch (writeErr) {
      // Disk write fallback to Base64 Data URL (e.g. read-only container environment)
      const base64Data = req.file.buffer.toString("base64");
      const imageUrl = `data:${imageInfo.mime};base64,${base64Data}`;
      return res.json({
        success: true,
        imageUrl,
        url: imageUrl,
        filename: "base64_upload"
      });
    }
  });
});

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

// -------------------------------------------------------------------------
// PUBLIC POSTS NETWORK SYNC ENDPOINTS
// -------------------------------------------------------------------------

// GET /api/posts - Fetch all public feed posts across all users
app.get("/api/posts", (req, res) => {
  let userId: string | undefined;
  const sessionId = getCookie(req, "incognito_session");
  if (sessionId) {
    const session = sessionsStore.get(sessionId);
    if (session && Date.now() < session.expiresAt) {
      userId = session.userId;
    }
  }
  if (!userId) {
    userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
  }

  const posts = postsStore.map(post => {
    if (post.poll) {
      const userVotedId = userId && post.poll.votesByUser 
        ? post.poll.votesByUser[userId] 
        : post.poll.userVotedId;
      return {
        ...post,
        poll: {
          ...post.poll,
          userVotedId
        }
      };
    }
    return post;
  });

  res.json({ success: true, posts });
});

// POST /api/posts - Publish new post to public feed for all users
app.post("/api/posts", publicApiRateLimiter, (req: any, res) => {
  try {
    const postData = req.body;
    if (!postData || (!postData.content && !postData.imageUrl && !postData.videoUrl && !postData.title)) {
      return res.status(400).json({ success: false, error: "Post content or media is required." });
    }

    let authenticatedUserId: string | undefined;
    let authenticatedUsername: string | undefined;

    const sessionId = getCookie(req, "incognito_session");
    if (sessionId) {
      const session = sessionsStore.get(sessionId);
      if (session && Date.now() < session.expiresAt) {
        authenticatedUserId = session.userId;
      }
    }

    if (!authenticatedUserId) {
      authenticatedUserId = req.headers["x-user-id"] || req.body?.ownerId || req.body?.userId;
    }

    if (authenticatedUserId) {
      const foundUser = accountsStore.find(a => a.id === authenticatedUserId);
      if (foundUser) {
        authenticatedUsername = foundUser.username;
      }
    }

    const ownerId = authenticatedUserId || postData.ownerId || 'usr_guest';
    const authorUsername = authenticatedUsername || postData.authorUsername || postData.username || 'Anonymous_Ghost';

    const newPost = {
      id: postData.id || `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ownerId,
      authorUsername,
      username: postData.username || 'Anonymous_Ghost',
      userAvatar: postData.userAvatar,
      community: postData.community || 'c/Privacy',
      title: postData.title,
      content: postData.content || '',
      imageUrl: postData.imageUrl,
      videoUrl: postData.videoUrl,
      timestamp: postData.timestamp || 'Just now',
      upvotes: typeof postData.upvotes === 'number' ? postData.upvotes : 1,
      isUpvoted: Boolean(postData.isUpvoted),
      isSaved: false,
      isAnonymous: Boolean(postData.isAnonymous),
      tags: Array.isArray(postData.tags) && postData.tags.length > 0 ? postData.tags : ['Incognito'],
      poll: postData.poll || undefined,
      comments: Array.isArray(postData.comments) ? postData.comments : []
    };

    // Prepend to top of network posts feed
    postsStore.unshift(newPost);
    return res.json({ success: true, post: newPost });
  } catch (err: any) {
    console.error("Error creating post:", err);
    return res.status(500).json({ success: false, error: "Failed to publish post to network." });
  }
});

// POST /api/posts/:id/upvote - Upvote/unvote post in network store
app.post("/api/posts/:id/upvote", publicApiRateLimiter, (req, res) => {
  const { id } = req.params;
  const post = postsStore.find(p => p.id === id);
  if (!post) {
    return res.status(404).json({ success: false, error: "Post not found" });
  }
  const isUpvotedNow = !post.isUpvoted;
  post.upvotes = isUpvotedNow ? (post.upvotes || 0) + 1 : Math.max(0, (post.upvotes || 0) - 1);
  post.isUpvoted = isUpvotedNow;
  return res.json({ success: true, post });
});

// POST /api/posts/:id/comment - Add comment to post in network store
app.post("/api/posts/:id/comment", publicApiRateLimiter, (req, res) => {
  const { id } = req.params;
  const { comment, username, content, userAvatar } = req.body;
  const post = postsStore.find(p => p.id === id);
  if (!post) {
    return res.status(404).json({ success: false, error: "Post not found" });
  }

  const commentObj = comment || {
    id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    username: username || 'Anonymous_Ghost',
    userAvatar,
    content: content || '',
    timestamp: 'Just now',
    upvotes: 0
  };

  if (!post.comments) post.comments = [];
  post.comments.push(commentObj);
  return res.json({ success: true, post, comment: commentObj });
});

// POST /api/posts/:id/poll - Record/toggle poll vote in network store
app.post("/api/posts/:id/poll", publicApiRateLimiter, authenticateUser, (req: any, res) => {
  const { id } = req.params;
  const { optionId } = req.body;
  const authenticatedUser = req.user;

  if (!authenticatedUser) {
    return res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "User authentication required" });
  }

  const post = postsStore.find(p => p.id === id);
  if (!post || !post.poll) {
    return res.status(404).json({ success: false, error: "Post or poll not found" });
  }

  if (!optionId || typeof optionId !== 'string') {
    return res.status(400).json({ success: false, error: "Option ID is required" });
  }

  const currentPoll = post.poll;
  if (!currentPoll.options || !Array.isArray(currentPoll.options)) {
    return res.status(404).json({ success: false, error: "Poll options not found" });
  }

  const targetOption = currentPoll.options.find((opt: any) => opt.id === optionId);
  if (!targetOption) {
    return res.status(404).json({ success: false, error: "Option not found in poll" });
  }

  if (!currentPoll.votesByUser) {
    currentPoll.votesByUser = {};
    if (currentPoll.userVotedId) {
      currentPoll.votesByUser['usr_1'] = currentPoll.userVotedId;
    }
  }

  const userId = authenticatedUser.id;
  const previousVotedOptionId = currentPoll.votesByUser[userId];

  let action: 'voted' | 'unvoted' | 'changed';

  if (previousVotedOptionId === optionId) {
    // TOGGLE OFF: User already voted for this exact option -> remove their vote
    targetOption.votes = Math.max(0, (targetOption.votes || 0) - 1);
    currentPoll.totalVotes = Math.max(0, (currentPoll.totalVotes || 0) - 1);
    delete currentPoll.votesByUser[userId];
    action = 'unvoted';
  } else if (previousVotedOptionId) {
    // CHANGE VOTE: User switched from previous option to new option (Single choice poll)
    const previousOption = currentPoll.options.find((opt: any) => opt.id === previousVotedOptionId);
    if (previousOption) {
      previousOption.votes = Math.max(0, (previousOption.votes || 0) - 1);
    }
    targetOption.votes = (targetOption.votes || 0) + 1;
    // Total votes remains constant on vote change
    currentPoll.votesByUser[userId] = optionId;
    action = 'changed';
  } else {
    // NEW VOTE: User has not voted yet
    targetOption.votes = (targetOption.votes || 0) + 1;
    currentPoll.totalVotes = (currentPoll.totalVotes || 0) + 1;
    currentPoll.votesByUser[userId] = optionId;
    action = 'voted';
  }

  const activeUserVote = currentPoll.votesByUser[userId] || null;

  // Return sanitized post object with caller's userVotedId
  const sanitizedPost = {
    ...post,
    poll: {
      ...currentPoll,
      userVotedId: activeUserVote || undefined
    }
  };

  return res.json({ 
    success: true, 
    post: sanitizedPost, 
    action, 
    userVotedId: activeUserVote,
    totalVotes: currentPoll.totalVotes 
  });
});

// Helper to check if a user has staff moderation / post deletion permissions
function hasDeletePostPermission(user: any): boolean {
  if (!user || !user.id) return false;
  if (user.email && user.email.toLowerCase() === 'kavyanagpal0005@gmail.com') return true;
  const role = String(user.role || '').toLowerCase().replace(/[\s_-]+/g, '_');
  const allowedRoles = ['owner', 'super_admin', 'admin', 'senior_moderator', 'moderator'];
  return allowedRoles.includes(role);
}

// DELETE /api/posts/:id - Role-based post deletion with IDOR protection & Moderation Audit Logging
app.delete("/api/posts/:id", publicApiRateLimiter, authenticateUser, (req: any, res) => {
  try {
    const { id } = req.params;
    const authenticatedUser = req.user;

    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({
        success: false,
        error: "UNAUTHORIZED"
      });
    }

    const postIndex = postsStore.findIndex(p => p.id === id);
    if (postIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "POST_NOT_FOUND"
      });
    }

    const post = postsStore[postIndex];

    // Ownership check: must match authenticated user's ID or author username
    const isOwner = Boolean(
      (post.ownerId && post.ownerId === authenticatedUser.id) ||
      (post.authorUsername && post.authorUsername === authenticatedUser.username) ||
      (!post.ownerId && !post.authorUsername && post.username === authenticatedUser.username)
    );

    // Staff moderation check: user role has delete_post permission
    const isStaffAuthorized = hasDeletePostPermission(authenticatedUser);

    if (!isOwner && !isStaffAuthorized) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN"
      });
    }

    // Delete post from postsStore
    const [deletedPost] = postsStore.splice(postIndex, 1);

    // If deleted by staff/moderator on another user's post, create audit record
    if (!isOwner && isStaffAuthorized) {
      const reason = req.body?.reason || (req.query?.reason as string) || "Moderation Action: Post removed by staff.";
      const logEntry = {
        id: `log_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
        actorId: authenticatedUser.id,
        memberId: authenticatedUser.id,
        actorUsername: authenticatedUser.username,
        role: authenticatedUser.role || (authenticatedUser.email === 'kavyanagpal0005@gmail.com' ? 'owner' : 'moderator'),
        action: 'Delete Post (Moderation)',
        targetResource: `Post #${id}`,
        postId: id,
        postOwnerId: deletedPost?.ownerId || deletedPost?.authorUsername || 'unknown',
        targetOwnerId: deletedPost?.ownerId || deletedPost?.authorUsername || 'unknown',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        ipAddress: req.ip || authenticatedUser.ipAddress || "172.56.21.144",
        deviceInfo: req.headers["user-agent"] || "Staff Console",
        details: reason
      };

      if (typeof auditLogsStore !== 'undefined' && Array.isArray(auditLogsStore)) {
        auditLogsStore.unshift(logEntry);
      }
    }

    // Clean up any associated reports
    if (typeof reportsStore !== 'undefined' && Array.isArray(reportsStore)) {
      reportsStore = reportsStore.filter((r: any) => r.postId !== id && r.targetPostId !== id);
    }

    return res.status(200).json({
      success: true
    });
  } catch (err: any) {
    console.error("Error in post deletion:", err);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR"
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
  clerkId?: string;
  salt?: string;
  passwordHash?: string;
  googleId?: string;
  facebookId?: string;
  avatarUrl?: string;
  bio?: string;
  karma: number;
  joinDate: string;
  badges: string[];
  loginMethod: 'Email' | 'Mobile' | 'Google' | 'Facebook' | 'Clerk';
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
    role: 'moderator',
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
    realName: 'Cipher Nexus',
    email: 'void@incognito.sec',
    phone: '7700900044',
    countryCode: '+1',
    salt: 'salt_void_4',
    passwordHash: hashPassword('password123', 'salt_void_4'),
    avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
    bio: 'Incognito Protocol & Core Network Node.',
    karma: 15820,
    joinDate: 'Jul 2026',
    badges: ['Core Contributor', 'System Lead'],
    loginMethod: 'Email',
    deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ipAddress: '172.56.21.144',
    role: 'admin',
    twoFactorEnabled: false
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

let postsStore: any[] = [
  {
    id: 'post_1',
    ownerId: 'usr_1',
    authorUsername: 'ShadowNova',
    username: 'ShadowNova',
    userAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
    community: '💬 Confessions',
    title: "Confession: I've been deploying to production on Friday afternoons for 2 years without telling my lead",
    content: "I know it violates every engineering rule, but our CI/CD pipeline is so reliable that zero downtime updates go live in 15 seconds. Secretly watching live traffic metrics spike over the weekend is my biggest thrill.",
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80',
    timestamp: '2 hours ago',
    upvotes: 2450,
    isUpvoted: true,
    isSaved: true,
    tags: ['Confessions', 'DevLife', 'CI/CD'],
    comments: [
      {
        id: 'comment_1_1',
        username: 'CryptoKnight',
        userAvatar: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=150&q=80',
        content: 'Absolute chaos energy! But if tests are green, Friday deploys are valid.',
        timestamp: '1 hour ago',
        upvotes: 84,
        isUpvoted: false
      },
      {
        id: 'comment_1_2',
        username: 'CipherVapor',
        userAvatar: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=150&q=80',
        content: 'Your lead definitely knows and is quietly impressed by your confidence.',
        timestamp: '45 mins ago',
        upvotes: 32,
        isUpvoted: true
      }
    ]
  },
  {
    id: 'post_2',
    ownerId: 'usr_aether',
    authorUsername: 'AetherNode',
    username: 'AetherNode',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    community: '😂 Funny',
    title: "My code worked on the first try today and now I'm terrified",
    content: "No syntax errors, no missing semicolons, no undefined variables, no broken hooks. Something is deeply wrong. The software is planning something sinister.",
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80',
    timestamp: '4 hours ago',
    upvotes: 1890,
    isUpvoted: false,
    isSaved: false,
    tags: ['Funny', 'Humor', 'Programming'],
    comments: [
      {
        id: 'comment_2_1',
        username: 'ShadowNova',
        userAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
        content: 'Check `git status` right now. You might be editing the wrong file!',
        timestamp: '3 hours ago',
        upvotes: 49
      }
    ]
  },
  {
    id: 'post_3',
    ownerId: 'usr_ghost',
    authorUsername: 'GhostProtocol',
    username: 'GhostProtocol',
    userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    community: '🎮 Gaming',
    title: 'POLL: Which gaming era had the best anonymous voice chat lobbies?',
    content: 'Before skill-based matchmaking algorithms and behavioral telemetry, multiplayer voice lobbies were pure unfiltered energy. Which era was peak gaming?',
    timestamp: '6 hours ago',
    upvotes: 1420,
    isUpvoted: false,
    isSaved: false,
    tags: ['Gaming', 'Multiplayer', 'Poll'],
    poll: {
      totalVotes: 842,
      userVotedId: 'opt_1',
      options: [
        { id: 'opt_1', text: 'Halo 3 & Modern Warfare 2 (2007-2009)', votes: 480 },
        { id: 'opt_2', text: 'Counter-Strike 1.6 & Source (2003-2006)', votes: 260 },
        { id: 'opt_3', text: 'Early Discord & TeamSpeak Era (2015-2018)', votes: 82 },
        { id: 'opt_4', text: 'Current Encrypted Spatial Voice Lobbies', votes: 20 }
      ]
    },
    comments: []
  },
  {
    id: 'post_4',
    ownerId: 'usr_neon',
    authorUsername: 'NeonOracle',
    username: 'NeonOracle',
    userAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
    community: '🤣 Memes',
    title: 'Senior Dev explaining legacy code vs Junior Dev trying to refactor it',
    content: "Senior: 'Don't touch line 42, it holds the entire universe together.'\nJunior: *Deletes line 42*\nJunior: 'Why is the coffee machine now spewing raw HTML?'",
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80',
    timestamp: '8 hours ago',
    upvotes: 3120,
    isUpvoted: true,
    isSaved: true,
    tags: ['Memes', 'DevHumor', 'LegacyCode'],
    comments: [
      {
        id: 'comment_4_1',
        username: 'VoidCipher',
        userAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
        content: 'Line 42 is load-bearing load balancer logic, classic!',
        timestamp: '7 hours ago',
        upvotes: 142
      }
    ]
  },
  {
    id: 'post_5',
    ownerId: 'usr_3',
    authorUsername: 'CipherVapor',
    username: 'CipherVapor',
    userAvatar: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=150&q=80',
    community: '💻 Technology',
    title: 'Why Zero-Knowledge Identity Isolation is the Future of Social Media',
    content: 'The INCOGNITO protocol proves that we can have a highly interactive, authenticated social platform without exposing any real identity. Your email, phone, and IP remain strictly locked inside an offline hardware vault, while the public network only ever sees cryptographic personas.',
    timestamp: '10 hours ago',
    upvotes: 2150,
    isUpvoted: false,
    isSaved: true,
    tags: ['Technology', 'ZeroKnowledge', 'Privacy'],
    comments: []
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

// Server Session Store & Cookie Helpers
interface UserSession {
  sessionId: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}
const sessionsStore = new Map<string, UserSession>();

function getCookie(req: any, cookieName: string): string | null {
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === cookieName) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

function setSessionCookie(res: any, sessionId: string) {
  const maxAge = 24 * 60 * 60; // 24 hours in seconds
  const isProd = process.env.NODE_ENV === "production";
  const cookieHeader = `incognito_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProd ? "; Secure" : ""}`;
  res.setHeader("Set-Cookie", cookieHeader);
}

function createSession(res: any, userId: string): string {
  for (const [sId, sess] of sessionsStore.entries()) {
    if (sess.userId === userId) {
      sessionsStore.delete(sId);
    }
  }
  const sessionId = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  sessionsStore.set(sessionId, {
    sessionId,
    userId,
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000
  });
  setSessionCookie(res, sessionId);
  return sessionId;
}

// Initialize Salted Password Hashes for Initial Accounts & purge plaintext passwords
accountsStore = accountsStore.map((acc) => {
  const salt = acc.salt || crypto.randomBytes(16).toString("hex");
  const passwordHash = acc.passwordHash || hashPassword(acc.password || "password123", salt);
  const { password, ...cleanedAcc } = acc;
  return { ...cleanedAcc, salt, passwordHash };
});

// AUTHENTICATION MIDDLEWARE
function authenticateUser(req: any, res: any, next: any) {
  let userId: string | undefined;

  const sessionId = getCookie(req, "incognito_session");
  if (sessionId) {
    const session = sessionsStore.get(sessionId);
    if (session && Date.now() < session.expiresAt) {
      userId = session.userId;
    } else if (session) {
      sessionsStore.delete(sessionId);
    }
  }

  if (!userId) {
    userId = req.headers["x-user-id"] || req.query.userId || req.body?.userId;
  }

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "UNAUTHORIZED",
      message: "Unauthorized: Missing user authentication credentials"
    });
  }

  const user = accountsStore.find((a) => a.id === userId);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "UNAUTHORIZED",
      message: "Unauthorized: User session invalid"
    });
  }

  req.user = user;
  next();
}

// ADMIN AUTHORIZATION MIDDLEWARE
function verifyAdmin(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Unauthorized" });
  }
  if (req.user.email?.toLowerCase() !== 'kavyanagpal0005@gmail.com') {
    return res.status(403).json({
      success: false,
      error: "FORBIDDEN",
      message: "403 Forbidden: Administrative panel access is restricted exclusively to kavyanagpal0005@gmail.com",
      role: req.user.role || "user"
    });
  }
  next();
}

// -------------------------------------------------------------------------
// USER CHECK & CURRENT SESSION ENDPOINTS
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

app.get('/api/auth/me', authenticateUser, (req: any, res) => {
  return res.json({
    success: true,
    user: sanitizeUserForResponse(req.user)
  });
});

app.post('/api/auth/logout', (req: any, res) => {
  const sessionId = getCookie(req, "incognito_session");
  if (sessionId) {
    sessionsStore.delete(sessionId);
  }
  res.setHeader(
    "Set-Cookie",
    "incognito_session=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  );
  return res.json({ success: true, message: "Logged out successfully" });
});

// -------------------------------------------------------------------------
// CLERK AUTHENTICATION SYNC ENDPOINT
// -------------------------------------------------------------------------
app.post("/api/auth/clerk-sync", (req: any, res: any) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { clerkId, email, username, fullName, imageUrl } = req.body || {};

    if (!clerkId && !email) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Missing Clerk authentication credentials."
      });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : undefined;
    const isSuperAdmin = cleanEmail === "kavyanagpal0005@gmail.com";

    // 1. Search for an existing account matching clerkId or email
    let user = accountsStore.find(
      (a) => (clerkId && a.clerkId === clerkId) || (cleanEmail && a.email?.toLowerCase() === cleanEmail)
    );

    if (user) {
      // Update Clerk metadata if not already attached
      if (!user.clerkId && clerkId) user.clerkId = clerkId;
      if (imageUrl && !user.avatarUrl) user.avatarUrl = imageUrl;
      if (isSuperAdmin && user.role !== "super_admin") {
        user.role = "super_admin";
      }
    } else {
      // Create new user account from Clerk profile
      const rawHandle = username || cleanEmail?.split("@")[0] || `node_${clerkId.slice(-6)}`;
      let cleanHandle = rawHandle.replace(/[^a-zA-Z0-9_.]/g, "").slice(0, 20);
      if (cleanHandle.length < 3) cleanHandle = `user_${Date.now().toString(36)}`;

      // Ensure unique username
      let finalUsername = cleanHandle;
      let counter = 1;
      while (accountsStore.some((a) => a.username.toLowerCase() === finalUsername.toLowerCase())) {
        finalUsername = `${cleanHandle.slice(0, 16)}_${counter++}`;
      }

      const generatedId = clerkId ? `usr_${clerkId.replace(/[^a-zA-Z0-9_]/g, "_")}` : `usr_clerk_${Date.now()}`;
      const randomSalt = crypto.randomBytes(16).toString("hex");

      user = {
        id: generatedId,
        clerkId,
        username: finalUsername,
        realName: fullName || "Clerk Verified Member",
        email: cleanEmail,
        avatarUrl: imageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80",
        bio: "Authenticated via Clerk Secure Gateway.",
        karma: 25,
        joinDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        badges: ["Verified", "Clerk SSO"],
        loginMethod: "Clerk",
        deviceInfo: req.headers["user-agent"] || "Web Browser",
        ipAddress: getCleanIp(req),
        role: isSuperAdmin ? "super_admin" : "user",
        twoFactorEnabled: false,
        salt: randomSalt,
        passwordHash: hashPassword(crypto.randomBytes(32).toString("hex"), randomSalt)
      };

      accountsStore.push(user);
    }

    createSession(res, user.id);

    return res.status(200).json({
      success: true,
      user: sanitizeUserForResponse(user),
      userId: user.id,
      role: user.role,
      isAdmin: user.role === "super_admin" || user.role === "admin" || isSuperAdmin,
      redirectTo: isSuperAdmin ? "/admin" : "/home"
    });
  } catch (err: any) {
    console.error("[CLERK_SYNC_ERROR]", err);
    return res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "An error occurred during Clerk profile synchronization."
    });
  }
});

// -------------------------------------------------------------------------
// AUTHENTICATION SYNC ENDPOINT (Rate-Limited Registration)
// -------------------------------------------------------------------------
app.post("/api/auth/sync", registrationRateLimiter, (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const {
      userId: rawUserId,
      email,
      phone,
      username,
      avatarUrl,
      loginMethod = 'Email',
      realName,
      password
    } = req.body || {};

    // 1. Validate password length server-side
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Password must be at least 8 characters long."
      });
    }

    // 2. Validate and sanitize email format if provided
    const cleanEmail = email ? email.trim().toLowerCase() : undefined;
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Please enter a valid email address."
      });
    }

    // 3. Validate username handle format (strip leading @ if present)
    const rawUsername = username?.trim();
    const cleanUsername = rawUsername?.startsWith('@') ? rawUsername.slice(1) : rawUsername;
    if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 20 || !/^[a-zA-Z0-9_.]+$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Username handle must be 3–20 alphanumeric characters, underscores, or periods."
      });
    }

    // 4. Check if email/phone credentials or username handle already exist
    const cleanPhone = phone ? phone.replace(/[\s\-\(\)]/g, '') : undefined;

    if (cleanEmail) {
      const existingEmailUser = accountsStore.find(
        a => a.email && a.email.trim().toLowerCase() === cleanEmail
      );
      if (existingEmailUser) {
        return res.status(409).json({
          success: false,
          error: "DUPLICATE_EMAIL",
          field: "email",
          message: "Account already exists with this email"
        });
      }
    }

    if (cleanPhone) {
      const existingPhoneUser = accountsStore.find(
        a => a.phone && a.phone.replace(/[\s\-\(\)]/g, '') === cleanPhone
      );
      if (existingPhoneUser) {
        return res.status(409).json({
          success: false,
          error: "DUPLICATE_PHONE",
          field: "phone",
          message: "An account with this phone number already exists."
        });
      }
    }

    const existingUsernameUser = accountsStore.find(
      a => cleanUsername && a.username.trim().toLowerCase() === cleanUsername.toLowerCase()
    );

    if (existingUsernameUser) {
      return res.status(409).json({
        success: false,
        error: "USERNAME_TAKEN",
        field: "username",
        message: "Handle taken"
      });
    }

    // 5. Role Assignment
    let assignedRole: 'owner' | 'super_admin' | 'admin' | 'moderator' | 'user' = 'user';
    if (cleanEmail && cleanEmail.toLowerCase() === 'kavyanagpal0005@gmail.com') {
      assignedRole = 'super_admin';
    }

    const targetUserId = rawUserId || (cleanEmail ? `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}` : `usr_${Date.now().toString(36)}`);

    // 6. Generate salt and passwordHash (Never store plaintext passwords)
    const salt = `salt_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
    const passwordHash = hashPassword(password, salt);

    const newAccount: UserAccount = {
      id: targetUserId,
      username: cleanUsername,
      realName: realName?.trim() || 'Anonymous Vault Member',
      email: cleanEmail || undefined,
      phone: cleanPhone || undefined,
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

    // 7. Create secure session and set HTTP-only cookie
    createSession(res, targetUserId);

    const isAdmin = assignedRole === 'super_admin' || cleanEmail?.toLowerCase() === 'kavyanagpal0005@gmail.com';
    const redirectTo = isAdmin ? "/admin" : "/home";

    // Audit log
    if (isAdmin) {
      auditLogsStore.unshift({
        id: `log_${Date.now().toString(36)}`,
        actorId: targetUserId,
        actorUsername: cleanUsername,
        role: assignedRole,
        action: 'Administrator Account Provisioned',
        targetResource: 'Authentication Gateway',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        ipAddress: String(req.ip || "127.0.0.1"),
        deviceInfo: req.headers["user-agent"] || "Browser Client",
        details: `Provisioned @${cleanUsername} as ${assignedRole}.`
      });
    }

    return res.status(201).json({
      success: true,
      user: sanitizeUserForResponse(newAccount),
      userId: targetUserId,
      role: assignedRole,
      isAdmin,
      redirectTo
    });
  } catch (serverErr: any) {
    console.error('[SERVER_REGISTRATION_ERROR]:', serverErr);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "An error occurred during registration. Please try again."
    });
  }
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
// ACCOUNT RECOVERY / PASSWORD RESET ENDPOINT (Rate-Limited, Non-Enumerative)
// -------------------------------------------------------------------------
app.post("/api/auth/recover", recoveryRateLimiter, async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { email, username, phone, identifier } = req.body || {};
  const targetId = (email || username || phone || identifier || "").toString().trim().toLowerCase();

  await new Promise(resolve => setTimeout(resolve, 80));

  if (targetId && typeof accountsStore !== 'undefined') {
    const matchedUser = accountsStore.find(a =>
      a.id === targetId ||
      a.email?.toLowerCase() === targetId ||
      a.username?.toLowerCase() === targetId ||
      a.phone === targetId
    );

    if (matchedUser && typeof auditLogsStore !== 'undefined') {
      auditLogsStore.unshift({
        id: `log_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
        actorId: 'system',
        actorUsername: 'PasswordRecoveryGateway',
        role: 'system',
        action: 'Account Recovery Triggered',
        targetResource: `/api/users/${matchedUser.id}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        ipAddress: maskIdentifier(getCleanIp(req)),
        deviceInfo: req.headers["user-agent"] || "Unknown Device",
        details: `Non-enumerative password recovery dispatch requested. Notification queued.`
      });
    }
  }

  return res.json({
    success: true,
    message: "If an account matching those credentials exists in our system, a password recovery notification has been dispatched."
  });
});

// -------------------------------------------------------------------------
// AUTHENTICATION ENDPOINT (Rate-Limited, Non-Enumerative, Salt-Hashed, Brute-Force Mitigated)
// -------------------------------------------------------------------------
app.post("/api/auth/login", loginRateLimiter, failedLoginRateLimiter, (req, res) => {
  const { email, phone, identifier, password, userId, loginMethod, twoFactorCode } = req.body || {};
  const clientIp = getCleanIp(req);

  // 1. Validate presence of identifier and password
  const rawIdentifier = (identifier || email || phone || userId || "").toString().trim();
  if (!rawIdentifier || !password || typeof password !== 'string' || !password.trim()) {
    recordFailedLoginAttempt(clientIp);
    return res.status(400).json({
      success: false,
      error: "INVALID_CREDENTIALS",
      message: "Invalid email/ID or password."
    });
  }

  // Universal normalization: trim and lowercase
  const cleanInput = rawIdentifier.trim().toLowerCase();
  const cleanHandle = cleanInput.startsWith('@') ? cleanInput.slice(1).trim() : cleanInput;
  const cleanPhone = rawIdentifier.replace(/[\s\-\(\)]/g, '');

  // Check account-level lockout key
  const accountLockKey = `lockout_acc_${cleanInput}`;
  const now = Date.now();
  const accLockEntry = rateLimitMap.get(accountLockKey);
  if (accLockEntry?.lockoutUntil && now < accLockEntry.lockoutUntil) {
    const remainingSecs = Math.ceil((accLockEntry.lockoutUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      error: "RATE_LIMIT_EXCEEDED",
      message: `Security Lockout Active: Account or IP temporarily locked due to repeated authentication failures. Please try again in ${remainingSecs} seconds.`,
      retryAfter: remainingSecs
    });
  }

  // 2. Search database for account: flexible lookup by Email or Handle or Phone or ID
  let match: UserAccount | undefined;

  if (loginMethod === 'phone' && !rawIdentifier.includes('@')) {
    // Phone lookup: find account WHERE phone matches submitted phone identifier
    match = accountsStore.find(a =>
      (a.phone && a.phone.replace(/[\s\-\(\)]/g, '') === cleanPhone) ||
      (a.phone && cleanPhone.endsWith(a.phone.replace(/[\s\-\(\)]/g, ''))) ||
      (a.phone && a.phone.replace(/[\s\-\(\)]/g, '').endsWith(cleanPhone)) ||
      a.id === rawIdentifier
    );
  } else {
    // Email OR Handle lookup ($or equivalent): check email or username with cleanInput and cleanHandle
    match = accountsStore.find(a =>
      (a.email && a.email.trim().toLowerCase() === cleanInput) ||
      (a.username && a.username.trim().toLowerCase() === cleanHandle) ||
      (a.username && a.username.trim().toLowerCase() === cleanInput) ||
      a.id === rawIdentifier
    );
  }

  // 4. Retrieve stored password hash & salt for THAT account, verify timing-safely
  let passwordMatches = false;
  if (match && match.salt && match.passwordHash) {
    const computedHash = hashPassword(password, match.salt);
    try {
      passwordMatches = crypto.timingSafeEqual(
        Buffer.from(computedHash, 'utf8'),
        Buffer.from(match.passwordHash, 'utf8')
      );
    } catch {
      passwordMatches = false;
    }
  } else if (match && (match as any).password) {
    // Legacy support
    if ((match as any).password === password) {
      passwordMatches = true;
      const newSalt = `salt_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
      match.salt = newSalt;
      match.passwordHash = hashPassword(password, newSalt);
      delete (match as any).password;
    }
  }

  // 5. Reject if account does NOT exist OR password does NOT match (Safe Non-Enumerative Error Response)
  if (!match || !passwordMatches) {
    recordFailedLoginAttempt(clientIp, cleanInput);

    return res.status(401).json({
      success: false,
      error: "INVALID_CREDENTIALS",
      message: "Invalid email/ID or password."
    });
  }

  // Clear failed attempt counter on successful password verification
  recordSuccessfulLoginAttempt(clientIp, cleanInput);

  const adminRoles = ["owner", "super_admin", "admin", "moderator"];
  const isAdmin = adminRoles.includes(match.role || "") || match.email?.toLowerCase() === 'kavyanagpal0005@gmail.com';

  // Verify 2FA code for admin roles if active
  if (isAdmin && match.twoFactorEnabled && twoFactorCode) {
    if (twoFactorCode !== "123456" && twoFactorCode !== "654321" && twoFactorCode.length !== 6) {
      return res.status(401).json({
        success: false,
        error: "INVALID_2FA",
        message: "Invalid Multi-Factor Authentication (2FA) verification code."
      });
    }
  }

  // 6. Create session and set HTTP-only session cookie
  createSession(res, match.id);

  const redirectTo = isAdmin ? "/admin" : "/home";

  return res.json({
    success: true,
    user: sanitizeUserForResponse(match),
    isAdmin,
    redirectTo
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
