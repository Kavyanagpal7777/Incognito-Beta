import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  RefreshCw,
  Check,
  Shield,
  Settings2,
  ChevronDown,
  X,
  Edit3,
  Dices,
  Zap,
  CheckCircle2
} from "lucide-react";
import { generateAnonymousUsernames } from "../utils/usernameGenerator";

interface AIUsernameGeneratorProps {
  currentUsername: string;
  onSelectUsername: (username: string) => void;
  existingUsernames: string[];
  triggerBtnClassName?: string;
  compactIconsOnly?: boolean;
}

const STYLES = [
  { id: "Mysterious", name: "Mysterious", icon: "🎭", desc: "Shadowy, silent & elusive handles" },
  { id: "Cyberpunk", name: "Cyberpunk", icon: "⚡", desc: "High-tech, neon & matrix identities" },
  { id: "Space", name: "Space", icon: "🌌", desc: "Cosmic, orbital & stellar callsigns" },
  { id: "Hacker", name: "Hacker", icon: "💻", desc: "Terminal, root & binary personas" },
  { id: "Dark", name: "Dark", icon: "🐺", desc: "Obscure, abyssal & nocturnal aliases" },
  { id: "Nature", name: "Nature", icon: "🌿", desc: "Elemental, sylvan & wild handles" },
  { id: "Gaming", name: "Gaming", icon: "🎮", desc: "Competitive, apex & clutch gamer tags" },
  { id: "Fantasy", name: "Fantasy", icon: "🐉", desc: "Arcane, mythical & rune monickers" },
  { id: "Funny", name: "Funny", icon: "😂", desc: "Quirky, memeable & playful names" },
  { id: "Surprise Me", name: "Surprise Me", icon: "🎲", desc: "Wildcard random neural fusion" },
];

export default function AIUsernameGenerator({
  currentUsername,
  onSelectUsername,
  existingUsernames,
  triggerBtnClassName,
  compactIconsOnly = false,
}: AIUsernameGeneratorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeStyle, setActiveStyle] = useState("Cyberpunk");
  const [customPrompt, setCustomPrompt] = useState("");
  const [maxLength, setMaxLength] = useState(18);
  const [allowNumbers, setAllowNumbers] = useState(true);
  const [allowSpecial, setAllowSpecial] = useState(true);

  const [suggestions, setSuggestions] = useState<string[]>(() => 
    generateAnonymousUsernames({ theme: "Cyberpunk", count: 10, existingUsernames })
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string>(
    currentUsername || suggestions[0] || "ShadowFox"
  );
  const [customEditValue, setCustomEditValue] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generate 10 username suggestions via server API or procedural fallback
  const handleGenerate = async (styleOverride?: string) => {
    const styleToUse = styleOverride || activeStyle;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: styleToUse,
          advancedPrompt: customPrompt.trim(),
          maxLength,
          allowNumbers,
          allowSpecial,
          count: 10,
          existingUsernames,
          excludePersonal: [currentUsername]
        }),
      });

      const data = await response.json();
      if (data.success && data.usernames && data.usernames.length > 0) {
        setSuggestions(data.usernames);
        setSelectedUsername(data.usernames[0]);
        setCustomEditValue(data.usernames[0]);
      } else {
        throw new Error(data.error || "Generation error");
      }
    } catch (err: any) {
      console.error(err);
      // Fallback to client-side procedural theme generator (10 ideas)
      const fallbackList = generateAnonymousUsernames({
        theme: styleToUse,
        count: 10,
        existingUsernames,
        excludePersonal: [currentUsername],
        maxLength,
        allowNumbers,
        allowSpecial,
      });
      setSuggestions(fallbackList);
      setSelectedUsername(fallbackList[0]);
      setCustomEditValue(fallbackList[0]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickRandom = () => {
    const availableStyles = STYLES.filter(s => s.id !== "Surprise Me");
    const randomStyle = availableStyles[Math.floor(Math.random() * availableStyles.length)].id;
    setActiveStyle(randomStyle);
    
    // Immediately generate 10 ideas based on random theme
    const randomBatch = generateAnonymousUsernames({
      theme: randomStyle,
      count: 10,
      existingUsernames,
      excludePersonal: [currentUsername]
    });
    setSuggestions(randomBatch);
    setSelectedUsername(randomBatch[0]);
    setCustomEditValue(randomBatch[0]);
    
    // Fill the selection into parent form
    onSelectUsername(randomBatch[0]);

    // Also trigger background server fetch for 10 more
    handleGenerate(randomStyle);
  };

  const handleConfirm = () => {
    const finalChoice = isEditing && customEditValue.trim() ? customEditValue.trim() : selectedUsername;
    if (finalChoice) {
      onSelectUsername(finalChoice);
      setIsModalOpen(false);
      setIsEditing(false);
    }
  };

  const modalJSX = isModalOpen ? (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}
      >
        {/* Fullscreen Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-xl"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={{
            maxWidth: '750px',
            width: 'min(92vw, 750px)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          className="relative z-[10000] w-[92vw] sm:w-[min(92vw,750px)] max-w-[750px] max-h-[85vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden bg-[#0c081e]/95 border border-violet-500/30 shadow-[0_25px_80px_rgba(124,58,237,0.4)] backdrop-blur-2xl rounded-3xl p-5 sm:p-7 md:p-8 space-y-5 text-left text-white my-auto custom-scrollbar"
          onClick={(e) => e.stopPropagation()}
          id="ai-username-modal"
        >
          {/* Subtle Top Glass Beam */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-4 gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)] flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-violet-300 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold font-display text-white tracking-wider uppercase truncate">
                    GENERATE YOUR ANONYMOUS PERSONA
                  </h3>
                  <p className="text-xs text-white/60">
                    Choose an anonymous username for your Incógnito identity.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer flex-shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Theme Style Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-violet-300/80 font-bold">
              <span>Persona Theme</span>
              <span className="text-white/40 font-normal">Select an archetype</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto pr-1">
              {STYLES.map((style) => {
                const isActive = activeStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => {
                      setActiveStyle(style.id);
                      handleGenerate(style.id);
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 group ${
                      isActive
                        ? "bg-violet-600/30 border-violet-400/70 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] scale-[1.02]"
                        : "bg-white/[0.02] border-white/5 text-white/60 hover:text-white hover:bg-white/5 hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base">{style.icon}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-violet-300" />}
                    </div>
                    <span className="text-xs font-bold tracking-tight block truncate">
                      {style.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Action Button to Trigger Generation */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold tracking-wide shadow-lg shadow-violet-600/35 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99]"
              id="btn-generate-10-ideas"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-violet-200" : "text-violet-200"}`} />
              <span>{isLoading ? "Synthesizing Neural Ideas..." : "[ Generate 10 New Ideas ]"}</span>
            </button>
          </div>

          {/* Advanced Tuning Optional Drawer */}
          <div className="border-t border-white/10 pt-2 space-y-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[10px] font-bold text-violet-400 hover:text-violet-300 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Advanced Tuning & Rules</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden pt-1"
                >
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold block">
                      Custom Instructions / Prompt (Optional)
                    </label>
                    <input
                      type="text"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="e.g. stealthy wolf, one-word futuristic cyberpunk alias"
                      className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white outline-none focus:border-violet-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold block">
                        Numbers
                      </label>
                      <button
                        type="button"
                        onClick={() => setAllowNumbers(!allowNumbers)}
                        className={`w-full py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                          allowNumbers ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-white/5 border-white/10 text-white/40"
                        }`}
                      >
                        {allowNumbers ? "Allowed" : "Off"}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold block">
                        Special (_ .)
                      </label>
                      <button
                        type="button"
                        onClick={() => setAllowSpecial(!allowSpecial)}
                        className={`w-full py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                          allowSpecial ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-white/5 border-white/10 text-white/40"
                        }`}
                      >
                        {allowSpecial ? "Allowed" : "Off"}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold block">
                        Max Length: {maxLength}
                      </label>
                      <input
                        type="range"
                        min="8"
                        max="20"
                        value={maxLength}
                        onChange={(e) => setMaxLength(parseInt(e.target.value))}
                        className="w-full mt-2 accent-violet-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 10 GENERATED SUGGESTIONS GRID */}
          <div className="space-y-2 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>10 Neural Username Ideas</span>
              </span>

              {isLoading && (
                <span className="text-xs text-violet-400 font-bold flex items-center gap-1.5 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Synthesizing...
                </span>
              )}
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-950/20 border border-rose-500/20 p-2.5 rounded-xl text-center">
                {error}
              </p>
            )}

            {/* RESPONSIVE GRID: 2 COLUMNS ON MOBILE, 3 ON TABLET, 5 ON DESKTOP */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {suggestions.slice(0, 10).map((sug, idx) => {
                const isSelected = selectedUsername === sug;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedUsername(sug);
                      setCustomEditValue(sug);
                      setIsEditing(false);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 group relative overflow-hidden ${
                      isSelected
                        ? "bg-gradient-to-br from-violet-600/40 via-purple-600/35 to-indigo-600/40 border-violet-400 text-white shadow-[0_0_25px_rgba(168,85,247,0.45)] ring-1 ring-violet-400/50"
                        : "bg-black/40 border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-violet-500/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className={`text-xs sm:text-sm font-mono font-bold tracking-tight truncate ${
                        isSelected ? "text-emerald-300" : "text-white/90 group-hover:text-emerald-300"
                      }`}>
                        @{sug}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-white/40 pt-1 border-t border-white/5">
                      <span>{sug.length} chars</span>
                      {isSelected ? (
                        <span className="flex items-center gap-0.5 text-emerald-400 font-bold">
                          <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="opacity-0 group-hover:opacity-100 text-violet-300">Select</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CHOSEN PERSONA DISPLAY & ACTIONS FOOTER */}
          <div className="p-4 rounded-2xl bg-violet-950/30 border border-violet-500/25 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-2">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-violet-300 block">
                CHOSEN PERSONA
              </span>
              {isEditing ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-mono text-sm font-bold">@</span>
                  <input
                    type="text"
                    value={customEditValue}
                    onChange={(e) => setCustomEditValue(e.target.value.replace(/\s+/g, ''))}
                    className="px-3 py-1 rounded-lg bg-black/60 border border-violet-500/50 text-sm font-mono font-bold text-emerald-300 outline-none w-full max-w-[200px]"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-mono font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                    @{selectedUsername}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="p-1 text-white/40 hover:text-violet-300 transition-colors cursor-pointer"
                    title="Edit handle directly"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* CANCEL AND CONFIRM BUTTONS */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white text-xs font-bold transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold tracking-wide shadow-lg shadow-violet-600/40 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                id="btn-confirm-use-handle"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Confirm & Use</span>
              </button>
            </div>
          </div>

          {/* Privacy Footnote */}
          <div className="flex items-center justify-center sm:justify-start gap-2 text-[10px] text-white/40 pt-1">
            <Shield className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
            <span>Zero PII used • Fully anonymous • Encrypted session profile</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  ) : null;

  return (
    <>
      {/* TRIGGER BUTTONS ROW */}
      {compactIconsOnly ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setIsModalOpen(true);
              if (suggestions.length === 0) handleGenerate();
            }}
            className="p-1.5 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 border border-violet-400/40 text-violet-200 transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Generate with AI"
            id="btn-open-ai-generator-compact"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-300 animate-pulse" />
          </button>
          <button
            type="button"
            onClick={handleQuickRandom}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Instantly generate random handle"
            id="btn-quick-random-compact"
          >
            <Dices className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsModalOpen(true);
              if (suggestions.length === 0) handleGenerate();
            }}
            className={
              triggerBtnClassName ||
              "px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600/30 via-purple-600/30 to-indigo-600/30 hover:from-violet-600/50 hover:to-indigo-600/50 border border-violet-400/30 text-violet-200 text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            }
            id="btn-open-ai-generator"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-300 animate-pulse" />
            <span>✨ Generate with AI</span>
          </button>

          <button
            type="button"
            onClick={handleQuickRandom}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            title="Instantly generate a random handle"
            id="btn-quick-random-handle"
          >
            <Dices className="w-3.5 h-3.5 text-cyan-400" />
            <span>🎲 Random</span>
          </button>
        </div>
      )}

      {/* RENDER MODAL IN PORTAL AT BODY ROOT TO ESCAPE CONTAINER OVERFLOW / TRANSFORMS */}
      {typeof document !== 'undefined' && modalJSX && createPortal(modalJSX, document.body)}
    </>
  );
}

