import { useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import { AREA_TODAS, esBajoStock, TAB_TODAS } from "../utils";

export default function InventarioView({
  productos,
  onMover,
  moviendoId,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaTab, setCategoriaTab] = useState(TAB_TODAS);
  const [areaFiltro, setAreaFiltro] = useState(AREA_TODAS);

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

  return (
    <>
      <div className="inv-header inv-header--inv">
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
      </div>

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
            · <strong className="inv-stats--warn">{bajosCount}</strong> con stock
            bajo
          </>
        ) : null}
      </p>

      <main className="inv-grid">
        {filtrados.length === 0 ? (
          <p className="inv-empty">
            No hay productos con estos filtros.
            {(busqueda ||
              categoriaTab !== TAB_TODAS ||
              areaFiltro !== AREA_TODAS) && (
              <button
                type="button"
                className="inv-chip inv-chip--active inv-empty__btn"
                onClick={() => {
                  setBusqueda("");
                  setCategoriaTab(TAB_TODAS);
                  setAreaFiltro(AREA_TODAS);
                }}
              >
                Limpiar filtros
              </button>
            )}
          </p>
        ) : (
          filtrados.map((producto) => (
            <ProductCard
              key={producto.id}
              producto={producto}
              onMover={onMover}
              moviendo={moviendoId === producto.id}
            />
          ))
        )}
      </main>
    </>
  );
}
