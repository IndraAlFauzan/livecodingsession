const timers = new Map<string, NodeJS.Timeout>();

export function debounceByKey(key: string, callback: () => void, delayMs = 300) {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    timers.delete(key);
    callback();
  }, delayMs);

  timers.set(key, timer);
}

export function clearDebounces() {
  for (const timer of timers.values()) {
    clearTimeout(timer);
  }
  timers.clear();
}
