import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'otp_cooldown_until';
const DEFAULT_COOLDOWN_SEC = 60;

function getStoredCooldown(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (!val) return 0;
    const ts = parseInt(val, 10);
    if (isNaN(ts)) return 0;
    return ts > Date.now() ? ts : 0;
  } catch {
    return 0;
  }
}

function setStoredCooldown(unixTs: number) {
  try {
    if (unixTs > Date.now()) {
      localStorage.setItem(STORAGE_KEY, String(unixTs));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function clearStoredCooldown() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function useCountdown() {
  const [cooldownUntil, setCooldownUntil] = useState(() => getStoredCooldown());
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    const until = getStoredCooldown();
    if (until) {
      const remaining = Math.ceil((until - Date.now()) / 1000);
      if (remaining > 0) {
        setSecondsLeft(remaining);
      } else {
        clearStoredCooldown();
        setCooldownUntil(0);
        setSecondsLeft(0);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } else {
      setCooldownUntil(0);
      setSecondsLeft(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tick]);

  const startCooldown = useCallback((seconds: number = DEFAULT_COOLDOWN_SEC) => {
    const until = Date.now() + seconds * 1000;
    setStoredCooldown(until);
    setCooldownUntil(until);
    setSecondsLeft(seconds);
    if (!intervalRef.current) {
      intervalRef.current = setInterval(tick, 1000);
    }
  }, [tick]);

  const clearCooldown = useCallback(() => {
    clearStoredCooldown();
    setCooldownUntil(0);
    setSecondsLeft(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const isCoolingDown = cooldownUntil > 0 && secondsLeft > 0;

  return { secondsLeft, isCoolingDown, startCooldown, clearCooldown };
}
