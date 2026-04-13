import "@/index.css";
import { useMemo, useState, useEffect } from "react";
import CalendarDemo from "@/components/calendar-demo";
import { WidgetVisibilityProvider } from "@/components/widget-visibility-context";
import { useLanguage } from "@/components/language-provider";
import { WindowSetPosition, WindowSetSize } from "../wailsjs/runtime/runtime";
import { CheckForUpdate, DownloadAndInstall } from "../wailsjs/go/main/App";

const GITHUB_REPO = "JKH-ML/windows-calendar-widget";

type UpdateState = "idle" | "downloading" | "error";

function App() {
  const [isOpen, setIsOpen] = useState(true);
  const [updateInfo, setUpdateInfo] = useState<{ downloadUrl: string } | null>(null);
  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const { resolvedLanguage } = useLanguage();

  useEffect(() => {
    CheckForUpdate(GITHUB_REPO)
      .then((info) => {
        if (info.updateAvailable && info.downloadUrl) {
          setUpdateInfo({ downloadUrl: info.downloadUrl });
        }
      })
      .catch(() => {});
  }, []);

  async function handleInstall() {
    if (!updateInfo) return;
    setUpdateState("downloading");
    try {
      await DownloadAndInstall(updateInfo.downloadUrl);
      // App will exit and restart — this line is rarely reached.
    } catch {
      setUpdateState("error");
    }
  }

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
        {updateInfo && (
          <div className="flex items-center justify-between gap-2 bg-amber-50 border-b border-amber-300 px-4 py-2 text-sm text-amber-800">
            <span>
              {updateState === "error"
                ? (resolvedLanguage === "ko" ? "업데이트 실패. 다시 시도해 주세요." : "Update failed. Please try again.")
                : updateState === "downloading"
                ? (resolvedLanguage === "ko" ? "다운로드 중... 잠시 후 재시작됩니다." : "Downloading... App will restart shortly.")
                : (resolvedLanguage === "ko" ? "새 버전이 출시되었습니다." : "A new version is available.")}
            </span>
            <div className="flex gap-2">
              {updateState !== "downloading" && (
                <button
                  type="button"
                  className="underline font-medium hover:text-amber-900 disabled:opacity-50"
                  onClick={handleInstall}
                >
                  {resolvedLanguage === "ko"
                    ? (updateState === "error" ? "재시도" : "지금 업데이트")
                    : (updateState === "error" ? "Retry" : "Update now")}
                </button>
              )}
              {updateState !== "downloading" && (
                <button
                  type="button"
                  className="text-amber-600 hover:text-amber-800"
                  onClick={() => setUpdateInfo(null)}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
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
