"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

type DisguiseMode = "docs" | "code";

type DisguiseContextValue = {
  isDisguised: boolean;
  mode: DisguiseMode;
  setMode: (mode: DisguiseMode) => void;
  showDisguise: () => void;
  toggleDisguise: () => void;
  unmask: () => void;
};

const DisguiseContext = createContext<DisguiseContextValue | null>(null);

export function DisguiseProvider({ children }: { children: ReactNode }) {
  const [isDisguised, setIsDisguised] = useState(false);
  const [mode, setMode] = useState<DisguiseMode>("docs");
  const lastShiftPress = useRef(0);

  const showDisguise = useCallback(() => setIsDisguised(true), []);
  const unmask = useCallback(() => setIsDisguised(false), []);
  const toggleDisguise = useCallback(() => {
    setIsDisguised((current) => !current);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        showDisguise();
        return;
      }

      if (event.key === "Shift") {
        const now = Date.now();
        if (now - lastShiftPress.current < 450) {
          showDisguise();
        }
        lastShiftPress.current = now;
      }

      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        unmask();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDisguise, unmask]);

  const value = useMemo(
    () => ({
      isDisguised,
      mode,
      setMode,
      showDisguise,
      toggleDisguise,
      unmask
    }),
    [isDisguised, mode, showDisguise, toggleDisguise, unmask]
  );

  return (
    <DisguiseContext.Provider value={value}>{children}</DisguiseContext.Provider>
  );
}

export function useDisguise() {
  const context = useContext(DisguiseContext);

  if (!context) {
    throw new Error("useDisguise must be used inside DisguiseProvider.");
  }

  return context;
}
