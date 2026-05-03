import { useEffect, useCallback } from "react";

type Options = {
  meta?: boolean;
  shift?: boolean;
  enabled?: boolean;
  preventDefault?: boolean;
};

export function useKeyboardShortcut(
  key: string,
  handler: (e: KeyboardEvent) => void,
  options: Options = {}
) {
  const { meta = false, shift = false, enabled = true, preventDefault = true } = options;

  const stableHandler = useCallback(handler, [handler]);

  useEffect(() => {
    if (!enabled) return;

    const listener = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const metaOk = !meta || e.metaKey || e.ctrlKey;
      const shiftOk = !shift || e.shiftKey;
      const keyOk = e.key.toLowerCase() === key.toLowerCase();

      if (meta && isTyping) return;
      if (!meta && isTyping && key !== "Escape") return;

      if (metaOk && shiftOk && keyOk) {
        if (preventDefault) e.preventDefault();
        stableHandler(e);
      }
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [key, stableHandler, meta, shift, enabled, preventDefault]);
}
