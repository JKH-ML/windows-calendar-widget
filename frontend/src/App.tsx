import "@/index.css";
import { useMemo, useState } from "react";
import CalendarDemo from "@/components/calendar-demo";
import { WidgetVisibilityProvider } from "@/components/widget-visibility-context";
import { useLanguage } from "@/components/language-provider";
import { useEffect } from "react";
import { WindowSetPosition, WindowSetSize } from "../wailsjs/runtime/runtime";

function App() {
  const [isOpen, setIsOpen] = useState(true);
  const { resolvedLanguage } = useLanguage();

  const widgetValue = useMemo(
    () => ({
      isOpen,
      openWidget: () => setIsOpen(true),
      closeWidget: () => setIsOpen(false),
    }),
    [isOpen]
  );

  useEffect(() => {
    const defaults = { width: 890, height: 800, x: 1030, y: 0 };
    let target = defaults;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("widget-position-size");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          target = {
            width: parsed.width ?? defaults.width,
            height: parsed.height ?? defaults.height,
            x: parsed.x ?? defaults.x,
            y: parsed.y ?? defaults.y,
          };
        } catch {
          target = defaults;
        }
      }
    }
    WindowSetSize(target.width, target.height);
    WindowSetPosition(target.x, target.y);
  }, []);

  return (
    <WidgetVisibilityProvider value={widgetValue}>
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-0 pb-0 pt-0 md:px-0 md:pb-0 md:pt-0">
          {isOpen ? (
            <CalendarDemo />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-8 text-center shadow-2xl shadow-black/5">
              <p className="text-lg font-semibold">
                {resolvedLanguage === "ko"
                  ? "캘린더가 닫혔습니다"
                  : "Calendar is closed"}
              </p>
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => setIsOpen(true)}
              >
                {resolvedLanguage === "ko" ? "다시 열기" : "Reopen"}
              </button>
            </div>
          )}
        </div>
      </div>
    </WidgetVisibilityProvider>
  );
}

export default App;
