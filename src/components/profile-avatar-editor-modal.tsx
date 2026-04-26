"use client";

import { useCallback, useRef, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { DEFAULT_PROFILE_AVATAR_PRESETS } from "@/lib/default-profile-avatar-presets";
import { useEscapeToClose } from "@/lib/use-escape-to-close";

type TabId = "upload" | "presets";

type ProfileAvatarEditorModalProps = {
  open: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  /** Current staged avatar URL (blob, remote preset, or saved URL) for preset highlight */
  avatarPreviewUrl: string | undefined;
  /** True when staged selection is a preset URL (not a file blob) */
  isPresetSelection: boolean;
  onApply: (file: File | null, previewObjectUrl: string) => void;
  /** When set and true, show “remove photo” in this modal; parent should open a confirm and/or stage removal. */
  onRequestRemoveProfilePhoto?: () => void;
  canRemoveProfilePhoto?: boolean;
};

const PREVIEW_PX = 260;
const EXPORT_SIZE = 640;
const ZOOM_MIN = 1;
const ZOOM_MAX = 2.85;

async function exportCircularAvatarJpeg(
  image: HTMLImageElement,
  zoom: number,
  panXPreview: number,
  panYPreview: number,
  previewSize: number,
  exportSize: number,
): Promise<Blob | null> {
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  if (!iw || !ih) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = exportSize;
  canvas.height = exportSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  const scaleUp = exportSize / previewSize;
  const panX = panXPreview * scaleUp;
  const panY = panYPreview * scaleUp;

  const base = Math.max(exportSize / iw, exportSize / ih) * zoom;
  const dw = iw * base;
  const dh = ih * base;
  const dx = (exportSize - dw) / 2 + panX;
  const dy = (exportSize - dh) / 2 + panY;

  ctx.clearRect(0, 0, exportSize, exportSize);
  ctx.save();
  ctx.beginPath();
  ctx.arc(exportSize / 2, exportSize / 2, exportSize / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(image, dx, dy, dw, dh);
  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
  });
}

export function ProfileAvatarEditorModal({
  open,
  onClose,
  isDarkMode,
  avatarPreviewUrl,
  isPresetSelection,
  onApply,
  onRequestRemoveProfilePhoto,
  canRemoveProfilePhoto = false,
}: ProfileAvatarEditorModalProps) {
  const [tab, setTab] = useState<TabId>("upload");
  const [step, setStep] = useState<"pick" | "adjust">("pick");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageReady, setImageReady] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 });
  const [exportBusy, setExportBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [presetLoadingId, setPresetLoadingId] = useState<string | null>(null);
  const presetFetchAbortRef = useRef<AbortController | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; panX: number; panY: number } | null>(
    null,
  );

  const resetInternal = useCallback(() => {
    presetFetchAbortRef.current?.abort();
    presetFetchAbortRef.current = null;
    setStep("pick");
    setTab("upload");
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setImageReady(false);
    setNaturalSize({ w: 1, h: 1 });
    setLoadError(false);
    setExportBusy(false);
    setPresetLoadingId(null);
    if (sourceUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(sourceUrl);
    }
    setSourceUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [sourceUrl]);

  useEscapeToClose(open, () => {
    resetInternal();
    onClose();
  });

  /** `objectUrl` is always a blob: URL (upload or prefetched remote poster) so the canvas is never tainted. */
  const goToAdjust = useCallback((objectUrl: string) => {
    if (sourceUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(sourceUrl);
    }
    setSourceUrl(objectUrl);
    setStep("adjust");
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setImageReady(false);
    setNaturalSize({ w: 1, h: 1 });
    setLoadError(false);
  }, [sourceUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    goToAdjust(objectUrl);
  };

  const handlePickPreset = async (presetId: string, imageUrl: string) => {
    presetFetchAbortRef.current?.abort();
    const ac = new AbortController();
    presetFetchAbortRef.current = ac;
    setPresetLoadingId(presetId);
    setLoadError(false);
    try {
      const res = await fetch(imageUrl, {
        mode: "cors",
        credentials: "omit",
        signal: ac.signal,
      });
      if (ac.signal.aborted) {
        return;
      }
      if (!res.ok) {
        setLoadError(true);
        return;
      }
      const blob = await res.blob();
      if (ac.signal.aborted) {
        return;
      }
      if (!blob.size) {
        setLoadError(true);
        return;
      }
      if (blob.type && !blob.type.startsWith("image/")) {
        setLoadError(true);
        return;
      }
      goToAdjust(URL.createObjectURL(blob));
    } catch (e: unknown) {
      const aborted =
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError");
      if (aborted) {
        return;
      }
      if (!ac.signal.aborted) {
        setLoadError(true);
      }
    } finally {
      if (presetFetchAbortRef.current === ac) {
        presetFetchAbortRef.current = null;
      }
      if (!ac.signal.aborted) {
        setPresetLoadingId(null);
      }
    }
  };

  const handleBackFromAdjust = () => {
    setStep("pick");
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setImageReady(false);
    setNaturalSize({ w: 1, h: 1 });
    setLoadError(false);
    if (sourceUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(sourceUrl);
    }
    setSourceUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleApplyAdjust = async () => {
    const img = imgRef.current;
    if (!img || !sourceUrl || !imageReady || exportBusy) {
      return;
    }

    setExportBusy(true);
    try {
      const blob = await exportCircularAvatarJpeg(
        img,
        zoom,
        pan.x,
        pan.y,
        PREVIEW_PX,
        EXPORT_SIZE,
      );
      if (blob) {
        const file = new File([blob], "profile-avatar.jpg", { type: "image/jpeg" });
        const preview = URL.createObjectURL(blob);
        onApply(file, preview);
        resetInternal();
        onClose();
        return;
      }
    } catch {
      // fall through
    } finally {
      setExportBusy(false);
    }

    setLoadError(true);
  };

  const previewLayout =
    imageReady && naturalSize.w > 0 && naturalSize.h > 0
      ? (() => {
          const { w: iw, h: ih } = naturalSize;
          const base = Math.max(PREVIEW_PX / iw, PREVIEW_PX / ih) * zoom;
          const dw = iw * base;
          const dh = ih * base;
          const left = (PREVIEW_PX - dw) / 2 + pan.x;
          const top = (PREVIEW_PX - dh) / 2 + pan.y;
          return { dw, dh, left, top };
        })()
      : null;

  const onPointerDownPreview = (event: React.PointerEvent<HTMLDivElement>) => {
    if (step !== "adjust" || !imageReady) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const onPointerMovePreview = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag?.active) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    setPan({ x: drag.panX + dx, y: drag.panY + dy });
  };

  const onPointerUpPreview = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.active) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    }
    dragRef.current = null;
  };

  const shellBorder = isDarkMode ? "border-white/12 bg-slate-950 text-slate-100" : "border-slate-200/90 bg-white text-slate-900";
  const tabActive = isDarkMode
    ? "bg-white/15 text-white ring-1 ring-white/20"
    : "bg-slate-900 text-white shadow-sm";
  const tabIdle = isDarkMode
    ? "text-slate-400 hover:bg-white/8 hover:text-slate-100"
    : "text-slate-600 hover:bg-slate-100";

  return (
    <ModalPortal open={open}>
      <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/45 backdrop-blur-md">
        <button
          type="button"
          aria-label="Close"
          onClick={() => {
            resetInternal();
            onClose();
          }}
          className="absolute inset-0 cursor-default bg-transparent"
        />
        <div
          className={`ui-shell ui-shell--dialog-lg relative z-10 mx-auto max-h-[min(90dvh,44rem)] w-full min-h-0 overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(15,23,42,0.22)] ${shellBorder}`}
        >
          <span className="ui-modal-accent-bar" aria-hidden />
          <div
            className={`flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5 ${
              isDarkMode ? "border-b-white/10" : "border-b-slate-100"
            }`}
          >
            <div className="min-w-0">
              <h2
                id="profile-avatar-editor-title"
                className={`text-lg font-semibold leading-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}
              >
                {step === "pick" ? "Profile photo" : "Position & zoom"}
              </h2>
              <p className={`mt-1.5 text-sm leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                {step === "pick"
                  ? "Upload an image or pick a default poster, then crop before saving your profile."
                  : "Drag to reposition. Pinch isn’t required — use zoom and drag. Applies to your profile when you tap Save."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetInternal();
                onClose();
              }}
              aria-label="Close"
              className={`ui-shell-close shrink-0 ${isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="ui-icon-md ui-icon-stroke" aria-hidden>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {step === "pick" ? (
            <>
              <div className="px-4 pt-3 sm:px-5" role="tablist" aria-label="Photo source">
                <div
                  className={`flex rounded-full p-1 ${isDarkMode ? "bg-white/[0.06]" : "bg-slate-100"}`}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "upload"}
                    onClick={() => setTab("upload")}
                    className={`min-h-10 flex-1 rounded-full px-3 text-center text-xs font-bold transition ${
                      tab === "upload" ? tabActive : tabIdle
                    }`}
                  >
                    Upload from gallery
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "presets"}
                    onClick={() => setTab("presets")}
                    className={`min-h-10 flex-1 rounded-full px-3 text-center text-xs font-bold transition ${
                      tab === "presets" ? tabActive : tabIdle
                    }`}
                  >
                    Default posters
                  </button>
                </div>
              </div>

              {tab === "upload" ? (
                <div className="space-y-4 px-4 py-5 sm:px-5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-10 transition ${
                      isDarkMode
                        ? "border-white/20 bg-white/[0.04] hover:border-violet-400/50 hover:bg-white/[0.07]"
                        : "border-slate-300 bg-slate-50/80 hover:border-violet-400/60 hover:bg-violet-50/40"
                    }`}
                  >
                    <span className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                      Choose a photo
                    </span>
                    <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                      JPEG, PNG, or WebP — you can crop on the next step
                    </span>
                  </button>
                </div>
              ) : (
                <div
                  className="max-h-[min(52dvh,22rem)] overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-4 pt-2 sm:px-4 [scrollbar-gutter:stable]"
                  role="listbox"
                  aria-labelledby="profile-avatar-editor-title"
                >
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
                    {DEFAULT_PROFILE_AVATAR_PRESETS.map((preset) => {
                      const selected =
                        isPresetSelection && avatarPreviewUrl === preset.imageUrl;
                      const busy = presetLoadingId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          disabled={Boolean(presetLoadingId)}
                          aria-busy={busy}
                          onClick={() => void handlePickPreset(preset.id, preset.imageUrl)}
                          className={`relative aspect-[2/3] w-full overflow-hidden rounded-xl ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-wait disabled:opacity-60 ${
                            selected
                              ? isDarkMode
                                ? "ring-2 ring-violet-300 ring-offset-2 ring-offset-slate-950"
                                : "ring-2 ring-violet-500 ring-offset-2 ring-offset-white"
                              : isDarkMode
                                ? "ring-white/12 hover:ring-violet-400/45"
                                : "ring-slate-200 hover:ring-violet-300"
                          } ${isDarkMode ? "bg-white/5" : "bg-slate-100"}`}
                          title={preset.label}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- remote preset art */}
                          <img
                            src={preset.imageUrl}
                            alt={preset.label}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                            sizes="(max-width: 640px) 50vw, 150px"
                          />
                          {busy ? (
                            <span
                              className="absolute inset-0 flex items-center justify-center bg-slate-950/45"
                              aria-hidden
                            >
                              <span
                                className={`h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white ${
                                  isDarkMode ? "opacity-95" : "opacity-95"
                                }`}
                              />
                            </span>
                          ) : null}
                          <span className="pointer-events-none absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-2 text-left text-[9px] font-semibold leading-tight text-white">
                            {preset.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {loadError && step === "pick" ? (
                    <p
                      className={`mt-3 text-center text-xs ${
                        isDarkMode ? "text-rose-300" : "text-rose-700"
                      }`}
                      role="alert"
                    >
                      Couldn’t open that poster. Check your connection, try another, or use Upload.
                    </p>
                  ) : null}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-5 px-4 py-5 sm:px-5">
              <button
                type="button"
                onClick={handleBackFromAdjust}
                className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? "text-violet-300 hover:text-violet-200" : "text-violet-700 hover:text-violet-800"}`}
              >
                ← Back
              </button>

              <div className="flex flex-col items-center gap-4">
                <div
                  className={`relative touch-none select-none overflow-hidden rounded-full shadow-inner ring-2 ${
                    isDarkMode ? "ring-violet-400/30" : "ring-violet-200"
                  }`}
                  style={{ width: PREVIEW_PX, height: PREVIEW_PX }}
                  onPointerDown={onPointerDownPreview}
                  onPointerMove={onPointerMovePreview}
                  onPointerUp={onPointerUpPreview}
                  onPointerCancel={onPointerUpPreview}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- blob or CDN URL for editor */}
                  <img
                    key={sourceUrl ?? "src"}
                    ref={imgRef}
                    src={sourceUrl ?? undefined}
                    alt=""
                    draggable={false}
                    className={`pointer-events-none max-w-none ${previewLayout ? "" : "opacity-0"}`}
                    width={previewLayout ? Math.round(previewLayout.dw) : undefined}
                    height={previewLayout ? Math.round(previewLayout.dh) : undefined}
                    style={
                      previewLayout
                        ? {
                            position: "absolute",
                            left: `${previewLayout.left}px`,
                            top: `${previewLayout.top}px`,
                          }
                        : { position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%" }
                    }
                    onLoad={(event) => {
                      const el = event.currentTarget;
                      setNaturalSize({ w: el.naturalWidth, h: el.naturalHeight });
                      setImageReady(true);
                      setLoadError(false);
                    }}
                    onError={() => {
                      setImageReady(false);
                      setLoadError(true);
                    }}
                  />
                </div>

                <div className="w-full max-w-xs space-y-2">
                  <label
                    className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wide ${
                      isDarkMode ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Zoom
                    <span className="tabular-nums">{zoom.toFixed(2)}×</span>
                  </label>
                  <input
                    type="range"
                    min={ZOOM_MIN}
                    max={ZOOM_MAX}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-violet-600"
                  />
                </div>

                {loadError ? (
                  <p className={`text-center text-xs ${isDarkMode ? "text-rose-300" : "text-rose-700"}`}>
                    Couldn’t apply your crop. Try a different file or another poster, then tap “Use photo” again.
                  </p>
                ) : (
                  <p className={`text-center text-[11px] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                    Drag the preview to frame your face or subject, then use “Use photo” — your zoom and position are
                    applied to the saved profile image.
                  </p>
                )}

                {canRemoveProfilePhoto && onRequestRemoveProfilePhoto ? (
                  <button
                    type="button"
                    onClick={() => {
                      resetInternal();
                      onRequestRemoveProfilePhoto();
                    }}
                    className={`w-full text-center text-xs font-semibold underline decoration-transparent underline-offset-2 transition hover:decoration-current ${
                      isDarkMode ? "text-rose-300" : "text-rose-700"
                    }`}
                  >
                    Remove profile photo
                  </button>
                ) : null}
              </div>
            </div>
          )}

          <div className={`border-t px-4 py-3 sm:px-5 ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
            {step === "pick" ? (
              <div className="flex flex-col gap-2">
                {canRemoveProfilePhoto && onRequestRemoveProfilePhoto ? (
                  <button
                    type="button"
                    onClick={() => {
                      resetInternal();
                      onRequestRemoveProfilePhoto();
                    }}
                    className="ui-btn ui-btn-danger w-full"
                  >
                    Remove profile photo
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    resetInternal();
                    onClose();
                  }}
                  className="ui-btn ui-btn-secondary w-full"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleBackFromAdjust}
                  className="ui-btn ui-btn-secondary min-w-0 flex-1"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!imageReady || exportBusy}
                  onClick={() => void handleApplyAdjust()}
                  className="ui-btn ui-btn-primary min-w-0 flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exportBusy ? "Saving…" : "Use photo"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
