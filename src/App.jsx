import { useCallback, useEffect, useState } from "react";
import {
  fetchMovimientos,
  fetchProductos,
  registrarMovimiento,
} from "./api";
import BottomNav from "./components/BottomNav";
import Dashboard from "./components/Dashboard";
import Historial from "./components/Historial";
import InventarioView from "./components/InventarioView";
import Login from "./components/Login";
import Toast from "./components/Toast";
import { clearSession, getSession, saveSession } from "./session";
import "./App.css";

export default function App() {
  const [session, setSession] = useState(() => getSession());
  const [vista, setVista] = useState("dashboard");
  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [moviendoId, setMoviendoId] = useState(null);
  const [error, setError] = useState(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [prods, movs] = await Promise.all([
        fetchProductos(),
        fetchMovimientos().catch(() => []),
      ]);
      setProductos(prods);
      setMovimientos(movs);
    } catch {
      setError("No se pudo cargar el inventario. Revisa la conexión.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (session) cargarDatos();
  }, [session, cargarDatos]);

  const handleLogin = (userSession) => {
    saveSession(userSession);
    setSession(userSession);
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setProductos([]);
    setMovimientos([]);
    setVista("dashboard");
  };

  const moverStock = useCallback(
    async (producto, cambio, nota = "") => {
      if (!session) return;
      setMoviendoId(producto.id);
      setError(null);
      try {
        const resultado = await registrarMovimiento({
          producto_id: producto.id,
          producto: producto.nombre,
          cambio,
          nota: nota || "",
          usuario: session.usuario,
        });

        setProductos((prev) =>
          prev.map((p) =>
            p.id === producto.id
              ? { ...p, stock_actual: resultado.nuevo_stock }
              : p
          )
        );

        const nuevoMov = {
          id: `local-${Date.now()}`,
          fecha: new Date().toISOString(),
          usuario: session.usuario,
          producto: producto.nombre,
          cambio,
          nota: nota || "",
          producto_id: producto.id,
        };

        setMovimientos((prev) => [nuevoMov, ...prev]);
      } catch (err) {
        setError(
          err.message || `Error al actualizar «${producto.nombre}». Intenta de nuevo.`
        );
      } finally {
        setMoviendoId(null);
      }
    },
    [session]
  );

  if (!session) {
    return <Login onSuccess={handleLogin} />;
  }

  if (cargando && productos.length === 0) {
    return (
      <div className="inv-app inv-app--main">
        <div className="inv-loading">
          <div className="inv-spinner" aria-hidden />
          <p>Cargando inventario…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inv-app inv-app--main">
      <header className="inv-topbar">
        <div className="inv-topbar__title">
          <h1>Inventario Villa Vitta</h1>
          <p className="inv-topbar__user">
            {session.usuario}
            {session.rol ? ` · ${session.rol}` : ""}
          </p>
        </div>
        <button
          type="button"
          className="inv-topbar__logout"
          onClick={handleLogout}
        >
          Salir
        </button>
      </header>

      {vista === "dashboard" && (
        <Dashboard
          productos={productos}
          movimientos={movimientos}
          onIrInventario={() => setVista("inventario")}
        />
      )}

      {vista === "inventario" && (
        <InventarioView
          productos={productos}
          onMover={moverStock}
          moviendoId={moviendoId}
        />
      )}

      {vista === "historial" && <Historial movimientos={movimientos} />}

      <BottomNav active={vista} onChange={setVista} />

      <Toast message={error} onClose={() => setError(null)} />
    </div>
  );
}
