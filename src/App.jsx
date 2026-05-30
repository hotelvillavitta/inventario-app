import { useCallback, useEffect, useState } from "react";
import {
  fetchMovimientos,
  fetchProductos,
  procesarVentas,
  registrarMovimiento,
} from "./api";

import BottomNav from "./components/BottomNav";
import Dashboard from "./components/Dashboard";
import Historial from "./components/Historial";
import InventarioView from "./components/InventarioView";
import Login from "./components/Login";
import Toast from "./components/Toast";

import {
  clearSession,
  getSession,
  saveSession,
} from "./session";

import { stocksTrasMovimientoComercial } from "./utils";

import "./App.css";

export default function App() {

  const [session, setSession] = useState(() => getSession());

  const [vista, setVista] = useState("dashboard");

  const [productos, setProductos] = useState([]);

  const [movimientos, setMovimientos] = useState([]);

  const [cargando, setCargando] = useState(false);

  const [moviendoId, setMoviendoId] = useState(null);

  const [procesandoVentas, setProcesandoVentas] =
    useState(false);

  const [toast, setToast] = useState(null);

  const cargarDatos = useCallback(async () => {

    setCargando(true);

    try {

      const [prods, movs] = await Promise.all([
        fetchProductos(),
        fetchMovimientos().catch(() => []),
      ]);

      setProductos(prods);
      setMovimientos(movs);

    } catch {

      setToast({
        message:
          "No se pudo cargar el inventario. Revisa la conexión.",
        type: "error",
      });

    } finally {

      setCargando(false);
    }

  }, []);

  useEffect(() => {

    if (session) {
      cargarDatos();
    }

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

      try {

        const resultado = await registrarMovimiento({
          producto_id: producto.id,
          producto: producto.nombre,
          cambio,
          nota: nota || "",
          usuario: session.usuario,
        });

        const desdeApi =
          resultado.nuevo_stock != null &&
          resultado.nuevo_stock_operativo != null;

        const calculado =
          stocksTrasMovimientoComercial(producto, cambio);

        setProductos((prev) =>
          prev.map((p) => {

            if (p.id !== producto.id) {
              return p;
            }

            if (desdeApi) {

              return {
                ...p,
                stock_actual: resultado.nuevo_stock,
                stock_operativo:
                  resultado.nuevo_stock_operativo,
              };
            }

            if (calculado) {

              return {
                ...p,
                ...calculado,
              };
            }

            return p;
          })
        );

        setMovimientos((prev) => [
          {
            id: `local-${Date.now()}`,
            fecha: new Date().toISOString(),
            usuario: session.usuario,
            producto: producto.nombre,
            cambio,
            nota: nota || "",
            producto_id: producto.id,
          },
          ...prev,
        ]);

        // 🔥 refresco real desde Sheets
        await cargarDatos();

      } catch (err) {

        setToast({
          message:
            err.message ||
            `Error al actualizar «${producto.nombre}».`,
          type: "error",
        });

      } finally {

        setMoviendoId(null);
      }
    },
    [session, cargarDatos]
  );

  const handleProcesarVentas = useCallback(async () => {

    if (!session || procesandoVentas) return;

    setProcesandoVentas(true);

    try {

      const res = await procesarVentas(session.usuario);

      // 🔥 refrescar inventario e historial
      await cargarDatos();

      setToast({
        message:
          `${res.ventas_procesadas ?? 0} ventas procesadas`,
        type: "success",
      });

    } catch (err) {

      setToast({
        message:
          err.message ||
          "Error al procesar ventas.",
        type: "error",
      });

    } finally {

      setProcesandoVentas(false);
    }

  }, [session, procesandoVentas, cargarDatos]);

  if (!session) {
    return <Login onSuccess={handleLogin} />;
  }

  if (cargando && productos.length === 0) {

    return (
      <div className="inv-app inv-app--main">

        <div className="inv-loading">

          <div
            className="inv-spinner"
            aria-hidden
          />

          <p>Cargando inventario…</p>

        </div>

      </div>
    );
  }

  return (

    <div className="inv-app inv-app--main">

      <header className="inv-topbar">

        <div className="inv-topbar__title">

          <div className="inv-brand">

            <img
              src="/app-icon.png"
              alt="Villa Vitta"
              className="inv-brand__logo"
            />

            <div>

              <h1>Inventario Villa Vitta</h1>

              <p className="inv-topbar__user">
                {session.usuario}
                {session.rol
                  ? ` · ${session.rol}`
                  : ""}
              </p>

            </div>

          </div>

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
          onIrInventario={() =>
            setVista("inventario")
          }
          onProcesarVentas={handleProcesarVentas}
          procesandoVentas={procesandoVentas}
        />
      )}

      {vista === "inventario" && (
        <InventarioView
          productos={productos}
          onMover={moverStock}
          moviendoId={moviendoId}
        />
      )}

      {vista === "historial" && (
        <Historial movimientos={movimientos} />
      )}

      <BottomNav
        active={vista}
        onChange={setVista}
      />

      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

    </div>
  );
}