import { useEffect, useState } from "react";
import { fetchUsuarios, login } from "../api";

export default function Login({ onSuccess }) {
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSel, setUsuarioSel] = useState("");
  const [pin, setPin] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsuarios()
      .then((list) => {
        setUsuarios(list);
        if (list.length > 0) setUsuarioSel(list[0].usuario);
      })
      .catch(() =>
        setError("No se pudieron cargar los usuarios. Actualiza Apps Script.")
      )
      .finally(() => setCargando(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usuarioSel || !pin) {
      setError("Selecciona usuario e ingresa tu PIN");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const res = await login(usuarioSel, pin);
      if (!res.ok) {
        setError(res.error || "PIN incorrecto");
        return;
      }
      onSuccess({
        usuario: res.usuario,
        rol: res.rol,
      });
    } catch (err) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="inv-app inv-app--login">
        <div className="inv-loading">
          <div className="inv-spinner" aria-hidden />
          <p>Cargando usuarios…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inv-app inv-app--login">
      <div className="inv-login">
        <div className="inv-login__brand">
          <span className="inv-login__logo">VV</span>
          <h1>Inventario Villa Vitta</h1>
          <p>Ingresa con tu PIN para continuar</p>
        </div>

        <form className="inv-login__form" onSubmit={handleSubmit}>
          <label className="inv-login__label">
            Usuario
            <select
              className="inv-login__select"
              value={usuarioSel}
              onChange={(e) => setUsuarioSel(e.target.value)}
              disabled={enviando || usuarios.length === 0}
            >
              {usuarios.map((u) => (
                <option key={u.usuario} value={u.usuario}>
                  {u.usuario}
                  {u.rol ? ` · ${u.rol}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="inv-login__label">
            PIN
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              className="inv-login__pin"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={enviando}
              autoComplete="off"
            />
          </label>

          {error ? (
            <p className="inv-login__error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="inv-login__submit"
            disabled={enviando || usuarios.length === 0}
          >
            {enviando ? "Verificando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
