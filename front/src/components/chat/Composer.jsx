import { useRef, useState } from "react";
import { Paperclip, Send, X, FileText, Clock } from "lucide-react";
import { fileToDataUrl, kindFromMime, formatBytes } from "../../utils/file";
import { MAX_FILE_BYTES_EXPORT } from "../../db/store";

export default function Composer({
  disabled,
  disabledReason,
  mediaDisabled,
  mediaDisabledReason,
  onSend,
  placeholder,
  onOpenSchedule,
}) {
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState(null); // { kind, name, size, dataUrl }
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  async function handleFilePick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (file.size > MAX_FILE_BYTES_EXPORT) {
      setError("File is larger than the 4MB demo limit.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setPendingFile({
        kind: kindFromMime(file.type),
        name: file.name,
        size: file.size,
        dataUrl,
      });
    } catch {
      setError("Could not read that file. Please try another one.");
    }
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (disabled || busy) return;
    setError("");

    if (pendingFile) {
      setBusy(true);
      const result = await onSend({
        kind: pendingFile.kind,
        text,
        fileName: pendingFile.name,
        fileSize: pendingFile.size,
        dataUrl: pendingFile.dataUrl,
      });
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPendingFile(null);
      setText("");
      return;
    }

    if (!text.trim()) return;
    const result = await onSend({ kind: "text", text });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setText("");
  }

  if (disabled) {
    return (
      <div
        style={{
          padding: "14px 18px",
          borderTop: "1px solid var(--border-soft)",
          color: "var(--text-muted)",
          fontSize: 13.5,
          textAlign: "center",
        }}
      >
        {disabledReason}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ borderTop: "1px solid var(--border-soft)", padding: 14 }}
    >
      {error && (
        <div className="field-error" style={{ marginBottom: 8 }}>
          {error}
        </div>
      )}

      {pendingFile && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--bg-input)",
            border: "1px solid var(--border-mid)",
            borderRadius: 10,
            padding: 8,
            marginBottom: 8,
          }}
        >
          {pendingFile.kind === "image" ? (
            <img
              src={pendingFile.dataUrl}
              alt=""
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                objectFit: "cover",
              }}
            />
          ) : (
            <FileText size={20} color="var(--accent-text)" />
          )}
          <span
            style={{
              fontSize: 13,
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {pendingFile.name}{" "}
            <span style={{ color: "var(--text-muted)" }}>
              ({formatBytes(pendingFile.size)})
            </span>
          </span>
          <button
            type="button"
            aria-label="Remove attachment"
            onClick={() => setPendingFile(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFilePick}
          style={{ display: "none" }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={mediaDisabled}
          title={
            mediaDisabled
              ? mediaDisabledReason
              : "Attach a photo, video, audio or file"
          }
          aria-label="Attach a file"
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 10,
            border: "1px solid var(--border-mid)",
            background: "var(--bg-input)",
            color: mediaDisabled
              ? "var(--text-muted)"
              : "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: mediaDisabled ? 0.5 : 1,
          }}
        >
          <Paperclip size={18} />
        </button>

        {onOpenSchedule && (
          <button
            type="button"
            onClick={onOpenSchedule}
            title="Schedule a message for later"
            aria-label="Schedule a message"
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: 10,
              border: "1px solid var(--border-mid)",
              background: "var(--bg-input)",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Clock size={18} />
          </button>
        )}

        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            pendingFile
              ? "Add a caption (optional)"
              : placeholder || "Write a message..."
          }
          className="field-input"
          style={{ resize: "none", flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        <button
          type="submit"
          disabled={busy || (!text.trim() && !pendingFile)}
          aria-label="Send message"
          className="btn btn-primary"
          style={{
            width: 40,
            height: 40,
            padding: 0,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Send size={17} />
        </button>
      </div>
    </form>
  );
}
