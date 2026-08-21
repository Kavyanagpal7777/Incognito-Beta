import React, { useState } from 'react';
import { ShieldCheck, Key, Copy, Check, ExternalLink, X, Sparkles, Terminal } from 'lucide-react';

interface ClerkConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClerkConfigModal: React.FC<ClerkConfigModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-6 bg-[#080d1a] border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,217,255,0.25)] text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
            <Key className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display text-white">Clerk Authentication Setup</h3>
            <p className="text-xs text-white/50">Enterprise Single Sign-On, Passkeys & Social Logins</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-white/80 leading-relaxed">
          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
            <p className="text-cyan-200 font-medium mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              How to connect your Clerk instance:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-white/70">
              <li>Open your <a href="https://dashboard.clerk.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline inline-flex items-center gap-0.5 hover:text-cyan-300">Clerk Dashboard <ExternalLink className="w-2.5 h-2.5 inline" /></a>.</li>
              <li>Navigate to <strong>API Keys</strong> in your Clerk project.</li>
              <li>Copy your <strong>Publishable Key</strong> (starts with <code className="text-purple-300">pk_test_...</code>) and <strong>Secret Key</strong> (<code className="text-purple-300">sk_test_...</code>).</li>
              <li>Add them to your project environment secrets or <code className="text-cyan-300">.env</code> file.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-white/60 font-mono text-[11px]">
              <span>REQUIRED ENVIRONMENT VARIABLES</span>
              <button
                type="button"
                onClick={() => copyToClipboard(`VITE_CLERK_PUBLISHABLE_KEY=pk_test_...\nCLERK_SECRET_KEY=sk_test_...`, 'env-block')}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                {copiedKey === 'env-block' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'env-block' ? 'Copied' : 'Copy Template'}</span>
              </button>
            </div>

            <div className="p-3 bg-black/60 border border-white/10 rounded-xl font-mono text-[11px] text-purple-300 space-y-1 overflow-x-auto">
              <div>VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY</div>
              <div>CLERK_SECRET_KEY=sk_test_YOUR_SECRET_KEY</div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-white/40">Custom anonymous & cryptographic login remains active anytime.</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-bold text-xs cursor-pointer transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
