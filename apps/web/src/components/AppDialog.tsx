import { FormEvent, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type DialogKind = "confirm" | "prompt" | "alert";
type DialogTone = "default" | "danger" | "success";
type DialogOptions = { title: string; message: string; confirmLabel?: string; cancelLabel?: string; defaultValue?: string; placeholder?: string; tone?: DialogTone };
type PendingDialog = DialogOptions & { kind: DialogKind; resolve: (value: boolean | string | null) => void };

const queue: PendingDialog[] = [];
let showNext: ((dialog: PendingDialog | null) => void) | null = null;

function enqueue(kind: DialogKind, options: DialogOptions) {
  return new Promise<boolean | string | null>((resolve) => {
    queue.push({ ...options, kind, resolve });
    if (showNext && queue.length === 1) showNext(queue[0]);
  });
}

export const confirmDialog = (options: DialogOptions) => enqueue("confirm", options) as Promise<boolean>;
export const promptDialog = (options: DialogOptions) => enqueue("prompt", options) as Promise<string | null>;
export const alertDialog = (options: DialogOptions) => enqueue("alert", options) as Promise<boolean>;

export function AppDialogHost() {
  const [dialog, setDialog] = useState<PendingDialog | null>(null);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    showNext = setDialog;
    if (queue[0]) setDialog(queue[0]);
    return () => { showNext = null; };
  }, []);
  useEffect(() => {
    if (!dialog) return;
    setValue(dialog.defaultValue ?? "");
    window.setTimeout(() => inputRef.current?.focus(), 0);
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") finish(dialog.kind === "confirm" ? false : null); };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [dialog]);

  function finish(result: boolean | string | null) {
    const current = queue.shift();
    current?.resolve(result);
    setDialog(queue[0] ?? null);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    finish(dialog?.kind === "prompt" ? value : true);
  }
  if (!dialog) return null;
  const Icon = dialog.tone === "danger" ? AlertTriangle : dialog.tone === "success" ? CheckCircle2 : Info;
  return <div className="app-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && dialog.kind !== "alert") finish(dialog.kind === "confirm" ? false : null); }}>
    <form className={`app-dialog app-dialog--${dialog.tone ?? "default"}`} role="alertdialog" aria-modal="true" aria-labelledby="app-dialog-title" aria-describedby="app-dialog-message" onSubmit={submit}>
      <button type="button" className="app-dialog__close" aria-label="Đóng" onClick={() => finish(dialog.kind === "confirm" ? false : null)}><X/></button>
      <div className="app-dialog__icon"><Icon/></div>
      <div className="app-dialog__copy"><h2 id="app-dialog-title">{dialog.title}</h2><p id="app-dialog-message">{dialog.message}</p></div>
      {dialog.kind === "prompt" && <input ref={inputRef} value={value} onChange={event => setValue(event.target.value)} placeholder={dialog.placeholder} aria-label={dialog.title}/>}
      <footer>
        {dialog.kind !== "alert" && <button type="button" className="app-dialog__cancel" onClick={() => finish(dialog.kind === "confirm" ? false : null)}>{dialog.cancelLabel ?? "Hủy"}</button>}
        <button type="submit" className="app-dialog__confirm">{dialog.confirmLabel ?? (dialog.kind === "alert" ? "Đã hiểu" : "Xác nhận")}</button>
      </footer>
    </form>
  </div>;
}
