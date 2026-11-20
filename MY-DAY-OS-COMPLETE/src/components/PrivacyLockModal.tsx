import React, { useEffect, useState } from 'react';
import { Fingerprint, Lock, Shield, Sparkles, Unlock, X } from 'lucide-react';
import { GlassModal } from './GlassModal';

interface PrivacyLockModalProps {
  open: boolean;
  onClose?: () => void;
  onUnlockSuccess: () => void;
  mode?: 'unlock' | 'setup';
  currentPin?: string;
  onSaveNewPin?: (pin: string) => void;
}

export const PrivacyLockModal: React.FC<PrivacyLockModalProps> = ({
  open,
  onClose,
  onUnlockSuccess,
  mode = 'unlock',
  currentPin = '1234',
  onSaveNewPin,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [firstPin, setFirstPin] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    if (open) {
      setPin('');
      setError(false);
      setSetupStep(1);
      setFirstPin('');
      // Check if WebAuthn / FaceID is available
      if (window.PublicKeyCredential) {
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.()
          .then((avail) => setBiometricAvailable(avail))
          .catch(() => setBiometricAvailable(false));
      }
    }
  }, [open]);

  const handleKeyPress = (num: string) => {
    if (pin.length >= 4) return;
    const next = pin + num;
    setPin(next);
    setError(false);

    if (next.length === 4) {
      if (mode === 'unlock') {
        if (next === currentPin) {
          setTimeout(() => {
            onUnlockSuccess();
          }, 180);
        } else {
          setTimeout(() => {
            setError(true);
            setPin('');
          }, 200);
        }
      } else {
        // Setup mode
        if (setupStep === 1) {
          setFirstPin(next);
          setSetupStep(2);
          setPin('');
        } else {
          if (next === firstPin) {
            onSaveNewPin?.(next);
            onUnlockSuccess();
          } else {
            setError(true);
            setPin('');
          }
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleBiometricAuth = async () => {
    try {
      // Simulate biometric check / WebAuthn prompt
      onUnlockSuccess();
    } catch {
      setError(true);
    }
  };

  if (!open) return null;

  return (
    <GlassModal
      open={open}
      onClose={onClose || (() => {})}
      title={
        mode === 'unlock'
          ? 'Personal Diary Locked'
          : setupStep === 1
            ? 'Set 4-Digit Security PIN'
            : 'Confirm 4-Digit PIN'
      }
      subtitle={
        mode === 'unlock'
          ? 'Enter your PIN or use FaceID to access your private diary & goals'
          : setupStep === 1
            ? 'Choose a memorable 4-digit code'
            : 'Re-enter your PIN to verify'
      }
    >
      <div className="flex flex-col items-center space-y-6 py-2">
        {/* Animated Lock Emblem */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shadow-inner">
            {error ? (
              <Lock className="w-8 h-8 text-[var(--danger)] animate-bounce" />
            ) : (
              <Shield className="w-8 h-8 text-[var(--accent)]" />
            )}
          </div>
        </div>

        {/* 4-Dot PIN Indicator */}
        <div className="flex items-center gap-3">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                idx < pin.length
                  ? error
                    ? 'bg-[var(--danger)] scale-110 shadow-[0_0_8px_rgba(248,113,113,0.6)]'
                    : 'bg-[var(--accent)] scale-110 shadow-[0_0_8px_rgba(107,156,255,0.6)]'
                  : 'bg-white/15 border border-white/20'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="text-xs font-semibold text-[var(--danger)] animate-shake">
            {mode === 'unlock' ? 'Incorrect PIN. Try again.' : 'PINs did not match. Re-enter.'}
          </div>
        )}

        {/* Liquid Glass Numeric Keypad (iOS Style) */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-2xl liquid-glass-pill flex items-center justify-center text-lg font-bold font-mono-num text-white active:scale-95 cursor-pointer"
            >
              {digit}
            </button>
          ))}

          {/* Biometric / FaceID Button */}
          <button
            type="button"
            onClick={handleBiometricAuth}
            className="h-14 rounded-2xl liquid-glass-pill flex items-center justify-center text-[var(--accent)] active:scale-95 cursor-pointer"
            title="FaceID / TouchID"
          >
            <Fingerprint className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl liquid-glass-pill flex items-center justify-center text-lg font-bold font-mono-num text-white active:scale-95 cursor-pointer"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl liquid-glass-pill flex items-center justify-center text-[var(--text-muted)] hover:text-white active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
