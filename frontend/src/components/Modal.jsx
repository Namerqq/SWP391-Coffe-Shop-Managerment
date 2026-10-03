import { useEffect, useRef } from "react";
import Icon from "./Icon";
export default function Modal({ title, onClose, children, busy = false }) {
  const root = useRef(null),
    close = useRef(onClose),
    busyRef = useRef(busy);
  close.current = onClose;
  busyRef.current = busy;
  useEffect(() => {
    const prev = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root.current?.focus();
    const key = (e) => {
      if (e.key === "Escape" && !busyRef.current) close.current();
      if (e.key === "Tab") {
        const nodes = root.current.querySelectorAll(
          "button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]",
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === root.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => !busy && e.target === e.currentTarget && onClose()}
    >
      <section
        className="modal-card"
        tabIndex={-1}
        ref={root}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button
            className="icon-button"
            disabled={busy}
            onClick={onClose}
            aria-label="Đóng"
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
