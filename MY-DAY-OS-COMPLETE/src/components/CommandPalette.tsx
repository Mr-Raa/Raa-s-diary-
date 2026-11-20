import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  Calendar,
  CheckSquare,
  Clock,
  Command,
  Droplets,
  FileText,
  Layers,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  Timer,
  X,
} from 'lucide-react';
import type { BootstrapData } from '../api/client';
import type { NavModule } from '../types';
import { buildCommandPaletteItems, type CommandItem } from '../utils/commandLogic';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  data: BootstrapData;
  onNavigate: (m: NavModule) => void;
  onQuickWater250: () => Promise<void>;
  onQuickAddTask: () => void;
  onQuickAddRoutine: () => void;
  onToggleTheme: () => Promise<void>;
  onOpenInstallGuide: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  data,
  onNavigate,
  onQuickWater250,
  onQuickAddTask,
  onQuickAddRoutine,
  onToggleTheme,
  onOpenInstallGuide,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => buildCommandPaletteItems(data, query), [data, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const executeItem = async (item: CommandItem) => {
    onClose();
    if (item.actionId) {
      switch (item.actionId) {
        case 'quick_water_250':
          await onQuickWater250();
          break;
        case 'quick_focus_25':
          onNavigate('focus');
          break;
        case 'quick_add_task':
          onQuickAddTask();
          break;
        case 'quick_add_routine':
          onQuickAddRoutine();
          break;
        case 'toggle_theme':
          await onToggleTheme();
          break;
        case 'open_download':
          onOpenInstallGuide();
          break;
      }
      return;
    }
    if (item.moduleTarget) {
      onNavigate(item.moduleTarget);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) =>
          items.length > 0 ? (prev - 1 + items.length) % items.length : 0
        );
      } else if (e.key === 'Enter' && items[activeIndex]) {
        e.preventDefault();
        void executeItem(items[activeIndex]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items, activeIndex]);

  if (!open || typeof document === 'undefined') return null;

  const renderIcon = (item: CommandItem) => {
    if (item.actionId === 'quick_water_250') return <Droplets className="w-4 h-4 text-[var(--accent-cyan)]" />;
    if (item.actionId === 'quick_focus_25') return <Timer className="w-4 h-4 text-[var(--success)]" />;
    if (item.actionId === 'toggle_theme') {
      return data.settings.theme === 'light' ? (
        <Moon className="w-4 h-4 text-[var(--accent)]" />
      ) : (
        <Sun className="w-4 h-4 text-[var(--warning)]" />
      );
    }
    if (item.actionId) return <Plus className="w-4 h-4 text-[var(--accent)]" />;
    switch (item.kind) {
      case 'task':
        return <CheckSquare className="w-4 h-4 text-[var(--success)]" />;
      case 'routine':
        return <Clock className="w-4 h-4 text-[var(--accent)]" />;
      case 'event':
        return <Calendar className="w-4 h-4 text-[var(--accent-secondary)]" />;
      case 'note':
        return <FileText className="w-4 h-4 text-[var(--warning)]" />;
      default:
        return item.moduleTarget === 'ai' ? (
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
        ) : (
          <Layers className="w-4 h-4 text-[var(--text-secondary)]" />
        );
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] bg-black/65 backdrop-blur-sm flex items-start justify-center p-3 pt-[max(3.5rem,env(safe-area-inset-top))] sm:pt-20"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Quick command palette and global search"
    >
      <div
        className="glass-modal ios-sheet-up w-full max-w-lg overflow-hidden flex flex-col max-h-[76dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--glass-border-subtle)]">
          <Search className="w-4 h-4 text-[var(--accent)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, routines, notes, water, AURAA..."
            aria-label="Command palette search"
            className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick search"
            className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
          {items.length === 0 ? (
            <div className="py-10 text-center text-xs text-[var(--text-muted)]">
              No matching commands, tasks, or notes.
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void executeItem(item)}
                  className={`w-full px-3 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-left transition-colors min-h-[48px] ${
                    isSelected
                      ? 'bg-[var(--accent)]/16 text-[var(--text-primary)]'
                      : 'hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                      {renderIcon(item)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-medium truncate">{item.title}</div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">{item.subtitle}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                      {item.kind}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="hidden sm:flex items-center justify-between px-4 py-2 border-t border-[var(--glass-border-subtle)] text-[11px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <Command className="w-3 h-3" />
            <span>K to open anytime</span>
          </span>
          <span>↑↓ Navigate · Enter Run · Esc Close</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
