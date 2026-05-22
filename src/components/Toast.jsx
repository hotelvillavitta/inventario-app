export default function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="inv-toast" role="alert">
      {message}
      <button type="button" className="inv-toast__close" onClick={onClose}>
        Cerrar
      </button>
    </div>
  );
}
