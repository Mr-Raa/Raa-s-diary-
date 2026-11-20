import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cloud,
  CheckCircle2,
  Copy,
  ExternalLink,
  Laptop,
  Smartphone,
  Sparkles,
  X,
  Server,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface CloudHostingModalProps {
  open: boolean;
  onClose: () => void;
}

export const CloudHostingModal: React.FC<CloudHostingModalProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState<'why' | 'render' | 'railway'>('why');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!open) return null;

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3.5 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative w-full max-w-2xl bg-[var(--surface)]/95 border border-white/15 rounded-3xl p-5 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl z-10 overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  ૨૪ કલાક ઓનલાઇન ક્લાઉડ ગાઈડ
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                    100% Free
                  </span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  લેપટોપ બંધ હોય તો પણ એપ iPhone અને મોબાઈલમાં 24/7 ચાલતી રાખવાની રીત
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Pills */}
          <div className="flex gap-2 my-4 p-1 bg-white/5 rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveTab('why')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'why'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              ૧. શા માટે બંધ થાય છે?
            </button>
            <button
              onClick={() => setActiveTab('render')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'render'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              ૨. Render.com (ફ્રી 24/7)
            </button>
            <button
              onClick={() => setActiveTab('railway')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'railway'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              ૩. રેડીમેડ ફાઈલો
            </button>
          </div>

          {/* Content Body */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar text-xs sm:text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {activeTab === 'why' && (
              <div className="space-y-3.5">
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-white space-y-2">
                  <div className="font-semibold text-blue-300 flex items-center gap-2">
                    <Laptop className="w-4 h-4" /> લેપટોપ બંધ થવાથી એપ કેમ અટકે છે?
                  </div>
                  <p className="text-xs text-blue-100/90 leading-relaxed">
                    હાલમાં આ એપ તમારા લેપટોપની અંદર <b>લોકલ સર્વર (localhost:3000)</b> પર ચાલી રહી છે. જ્યારે લેપટોપ સ્લીપ થાય અથવા બંધ કરો, ત્યારે તેનું લોકલ નેટવર્ક બંધ થઈ જાય છે.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> સોલ્યુશન ૧: ઑફલાઇન મોડ (તૈયાર છે)
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      અમે એપમાં <b>ઓટોમેટિક ઑફલાઇન સ્ટોરેજ</b> ઉમેરી દીધું છે. લેપટોપ બંધ હશે તો પણ તમારા iPhone X કે ફોનમાં બધી ડાયરી નોટ્સ, ટાસ્ક અને પાણી લોગ ખુલ્લું રહેશે અને ડેટા સચવાશે!
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <div className="font-bold text-indigo-400 flex items-center gap-1.5">
                      <Zap className="w-4 h-4" /> સોલ્યુશન ૨: ક્લાઉડ હોસ્ટિંગ (કાયમી ઓનલાઇન)
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      ગૂગલ કે ઇન્સ્ટાગ્રામની જેમ એપને <b>Render.com</b> પર ફ્રીમાં હોસ્ટ કરી દો. પછી લેપટોપ હંમેશા માટે બંધ હોય તો પણ આખી દુનિયામાંથી તમારો ફોન ૨૪ કલાક ચાલશે!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'render' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="font-bold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-400" />
                    Render.com પર ૨ મિનિટમાં ફ્રી હોસ્ટ કરવાની રીત:
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-[var(--text-secondary)]">
                    <li>
                      <b className="text-white">GitHub પર મૂકો</b>: તમારા પ્રોજેક્ટને ગિટહબ (GitHub) માં પ્રાઇવેટ અથવા પબ્લિક રેપોઝીટરી તરીકે અપલોડ કરો.
                    </li>
                    <li>
                      <b className="text-white">Render.com ખોલો</b>:{' '}
                      <a
                        href="https://render.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 underline inline-flex items-center gap-0.5"
                      >
                        render.com <ExternalLink className="w-3 h-3" />
                      </a>{' '}
                      પર જઈને ફ્રીમાં Sign In કરો.
                    </li>
                    <li>
                      <b className="text-white">New Web Service</b> પર ક્લિક કરો અને તમારી GitHub Repo સિલેક્ટ કરો.
                    </li>
                    <li>
                      <b className="text-white">Settings સેટ કરો</b>:
                      <div className="mt-1.5 p-2.5 rounded-xl bg-black/40 font-mono text-[11px] text-emerald-400 space-y-1">
                        <div>Build Command: npm install && npm run build</div>
                        <div>Start Command: npm start</div>
                        <div>Environment: Node 22</div>
                      </div>
                    </li>
                    <li>
                      <b className="text-white">Deploy Web Service</b> પર ક્લિક કરો!
                    </li>
                  </ol>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>
                    બસ! તમને <b>https://raas-diary.onrender.com</b> જેવી તમારી પોતાની કાયમી લિંક મળશે. પછી લેપટોપની ક્યારેય જરૂર નહીં પડે!
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'railway' && (
              <div className="space-y-3">
                <p className="text-xs">
                  અમે તમારા પ્રોજેક્ટમાં ક્લાઉડ ડિપ્લોયમેન્ટ માટેની બધી જરૂરી કન્ફિગરેશન ફાઈલો બનાવી દીધી છે:
                </p>

                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">Dockerfile</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        કોઈપણ ક્લાઉડ (Render, Railway, Fly.io, DigitalOcean) માટે
                      </div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/10 text-white">
                      પ્રોજેક્ટ રૂટમાં છે
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">render.yaml</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Render Blueprint 1-Click Auto Deploy કન્ફિગરેશન
                      </div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/10 text-white">
                      તૈયાર છે
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">
                        RAA_DIARY_CLOUD_DEPLOY_GUJARATI.txt
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        તમારા ડેસ્કટોપ અને ડાઉનલોડ્સમાં સ્ટેપ-બાય-સ્ટેપ ગુજરાતી ગાઈડ
                      </div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400">
                      ડેસ્કટોપ પર ઉપલબ્ધ
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              iPhone X & Android 100% સપોર્ટેડ
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors"
            >
              સમજાઈ ગયું (Close)
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
