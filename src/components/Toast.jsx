export default function Toast({ message, type = "error", onClose }) {
  if (!message) return null;
  return (
    <div className={`inv-toast inv-toast--${type}`} role="alert">
      {message}
      <button type="button" className="inv-toast__close" onClick={onClose}>
        Cerrar
      </button>
    </div>
  );
}
