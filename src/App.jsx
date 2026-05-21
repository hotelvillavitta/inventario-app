import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL =
  "https://script.google.com/macros/s/AKfycbzamD5CYg8ya6PaTuNFn4myR2-WINyKyIoW6NRt-jkkWU_hJJYwls6YfYaUsrfw30nk/exec";

const QUICK_ADD = [1, 5, 10];
const QUICK_SUB = [1, 5, 10];
const TAB_TODAS = "Todas";
const AREA_TODAS = "Todas";

function esBajoStock(producto) {
  const min = Number(producto.stock_minimo);
  const actual = Number(producto.stock_actual);
  if (Number.isNaN(min) || Number.isNaN(actual)) return false;
  return actual <= min;
}

function ProductCard({ producto, onMover, moviendo }) {
  const [comentario, setComentario] = useState("");
  const [cantidadManual, setCantidadManual] = useState("1");
  const bajo = esBajoStock(producto);

  const aplicar = (cambio) => {
    onMover(producto, cambio, comentario.trim());
  };

  const aplicarManual = (entrada) => {
    const n = Math.abs(parseInt(cantidadManual, 10));
    if (!n || Number.isNaN(n)) return;
    aplicar(entrada ? n : -n);
  };

  return (
    <article
      className={`inv-card${bajo ? " inv-card--low" : ""}${moviendo ? " inv-card--busy" : ""}`}
    >
      <div className="inv-card__img-wrap">
        {producto.foto ? (
          <img
            className="inv-card__img"
            src={producto.foto}
            alt=""
            loading="lazy"
          />
        ) : null}
        {bajo ? <span className="inv-card__badge">Stock bajo</span> : null}
        {moviendo ? (
          <div className="inv-card__busy">
            <div className="inv-spinner" aria-hidden />
          </div>
        ) : null}
      </div>

      <div className="inv-card__body">
        <h2 className="inv-card__title">{producto.nombre}</h2>

        <div className="inv-card__meta">
          {producto.categoria ? <span>{producto.categoria}</span> : null}
          {producto.area ? <span>{producto.area}</span> : null}
          {producto.unidad ? <span>{producto.unidad}</span> : null}
        </div>

        <div className="inv-stock-row">
          <span className="inv-stock-row__label">Stock actual</span>
          <span className="inv-stock-row__value">{producto.stock_actual}</span>
        </div>
        {producto.stock_minimo != null && producto.stock_minimo !== "" ? (
          <p className="inv-stock-row__min">
            Mínimo: {producto.stock_minimo}
          </p>
        ) : null}

        <div className="inv-quick" role="group" aria-label="Entrada rápida">
          {QUICK_ADD.map((n) => (
            <button
              key={`+${n}`}
              type="button"
              className="inv-btn inv-btn--add"
              disabled={moviendo}
              onClick={() => aplicar(n)}
            >
              +{n}
            </button>
          ))}
        </div>

        <div className="inv-quick" role="group" aria-label="Salida rápida">
          {QUICK_SUB.map((n) => (
            <button
              key={`-${n}`}
              type="button"
              className="inv-btn inv-btn--sub"
              disabled={moviendo}
              onClick={() => aplicar(-n)}
            >
              −{n}
            </button>
          ))}
        </div>

        <div className="inv-manual">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            className="inv-manual__input"
            value={cantidadManual}
            onChange={(e) => setCantidadManual(e.target.value)}
            aria-label="Cantidad manual"
            disabled={moviendo}
          />
          <div className="inv-manual__actions">
            <button
              type="button"
              className="inv-btn inv-btn--add inv-manual__btn"
              disabled={moviendo}
              onClick={() => aplicarManual(true)}
            >
              Entrada
            </button>
            <button
              type="button"
              className="inv-btn inv-btn--sub inv-manual__btn"
              disabled={moviendo}
              onClick={() => aplicarManual(false)}
            >
              Salida
            </button>
          </div>
        </div>

        <textarea
          className="inv-comment"
          placeholder="Comentario opcional (ej. merma, pedido…)"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={2}
          disabled={moviendo}
        />
      </div>
    </article>
  );
}

export default function App() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaTab, setCategoriaTab] = useState(TAB_TODAS);
  const [areaFiltro, setAreaFiltro] = useState(AREA_TODAS);
  const [moviendoId, setMoviendoId] = useState(null);
  const [error, setError] = useState(null);

  const cargarProductos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}?action=productos`);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch {
      setError("No se pudo cargar el inventario. Revisa la conexión.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  const moverStock = useCallback(async (producto, cambio, nota = "") => {
    setMoviendoId(producto.id);
    setError(null);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "movimiento",
          producto_id: producto.id,
          producto: producto.nombre,
          cambio,
          nota: nota || "",
          usuario: "Empleado",
        }),
      });

      const resultado = await res.json();

      setProductos((prev) =>
        prev.map((p) =>
          p.id === producto.id
            ? { ...p, stock_actual: resultado.nuevo_stock }
            : p
        )
      );
    } catch {
      setError(`Error al actualizar «${producto.nombre}». Intenta de nuevo.`);
    } finally {
      setMoviendoId(null);
    }
  }, []);

  const categorias = useMemo(() => {
    const set = new Set();
    productos.forEach((p) => {
      if (p.categoria) set.add(p.categoria);
    });
    return [TAB_TODAS, ...[...set].sort((a, b) => a.localeCompare(b, "es"))];
  }, [productos]);

  const areas = useMemo(() => {
    const set = new Set();
    productos.forEach((p) => {
      if (p.area) set.add(p.area);
    });
    return [AREA_TODAS, ...[...set].sort((a, b) => a.localeCompare(b, "es"))];
  }, [productos]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      if (q && !p.nombre?.toLowerCase().includes(q)) return false;
      if (categoriaTab !== TAB_TODAS && p.categoria !== categoriaTab)
        return false;
      if (areaFiltro !== AREA_TODAS && p.area !== areaFiltro) return false;
      return true;
    });
  }, [productos, busqueda, categoriaTab, areaFiltro]);

  const bajosCount = useMemo(
    () => filtrados.filter(esBajoStock).length,
    [filtrados]
  );

  if (cargando) {
    return (
      <div className="inv-app">
        <div className="inv-loading">
          <div className="inv-spinner" aria-hidden />
          <p>Cargando inventario…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inv-app">
      <header className="inv-header">
        <h1>Inventario</h1>
        <input
          type="search"
          className="inv-search"
          placeholder="Buscar producto…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />

        {categorias.length > 1 ? (
          <div className="inv-tabs-wrap">
            <div className="inv-tabs" role="tablist" aria-label="Categorías">
              {categorias.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={categoriaTab === cat}
                  className={`inv-tab${categoriaTab === cat ? " inv-tab--active" : ""}`}
                  onClick={() => setCategoriaTab(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      {areas.length > 1 ? (
        <section className="inv-filters" aria-label="Filtro por ubicación">
          <span className="inv-filter-label">Ubicación</span>
          <div className="inv-chips">
            {areas.map((area) => (
              <button
                key={area}
                type="button"
                className={`inv-chip${areaFiltro === area ? " inv-chip--active" : ""}`}
                onClick={() => setAreaFiltro(area)}
              >
                {area}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <p className="inv-stats">
        <strong>{filtrados.length}</strong> producto
        {filtrados.length !== 1 ? "s" : ""}
        {bajosCount > 0 ? (
          <>
            {" "}
            · <strong style={{ color: "#fca5a5" }}>{bajosCount}</strong> con
            stock bajo
          </>
        ) : null}
      </p>

      <main className="inv-grid">
        {filtrados.length === 0 ? (
          <p className="inv-empty">
            No hay productos con estos filtros.
            {(busqueda || categoriaTab !== TAB_TODAS || areaFiltro !== AREA_TODAS) && (
              <>
                {" "}
                <button
                  type="button"
                  className="inv-chip inv-chip--active"
                  style={{ marginTop: 12 }}
                  onClick={() => {
                    setBusqueda("");
                    setCategoriaTab(TAB_TODAS);
                    setAreaFiltro(AREA_TODAS);
                  }}
                >
                  Limpiar filtros
                </button>
              </>
            )}
          </p>
        ) : (
          filtrados.map((producto) => (
            <ProductCard
              key={producto.id}
              producto={producto}
              onMover={moverStock}
              moviendo={moviendoId === producto.id}
            />
          ))
        )}
      </main>

      {error ? (
        <div className="inv-toast" role="alert">
          {error}
          <button
            type="button"
            style={{
              marginLeft: 12,
              background: "transparent",
              border: "1px solid #fff",
              color: "#fff",
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
              fontSize: "0.75rem",
            }}
            onClick={() => setError(null)}
          >
            Cerrar
          </button>
        </div>
      ) : null}
    </div>
  );
}
