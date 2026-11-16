"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
const MotionContext = createContext({
  paused: true,
  toggle: () => {},
  systemReduced: true,
});
const subscribe = (notify) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const getSnapshot = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const getServerSnapshot = () => true;
export function useMotionPreference() {
  return useContext(MotionContext);
}
export default function MotionProvider({ children }) {
  const systemReduced = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [userPaused, setUserPaused] = useState(false);
  const paused = systemReduced || userPaused;
  useEffect(() => {
    document.documentElement.dataset.motion = paused ? "off" : "on";
    return () => {
      delete document.documentElement.dataset.motion;
    };
  }, [paused]);
  return (
    <MotionContext.Provider
      value={{
        paused,
        systemReduced,
        toggle: () => setUserPaused((value) => !value),
      }}
    >
      {children}
    </MotionContext.Provider>
  );
}
