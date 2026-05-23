import { useMemo } from "react";
import { contarCategorias, esBajoStock, esHoy } from "../utils";

export default function Dashboard({
  productos,
  movimientos,
  onIrInventario,
  onProcesarVentas,
  procesandoVentas,
}) {
  const bajos = useMemo(
    () => productos.filter(esBajoStock),
    [productos]
  );

  const movimientosHoy = useMemo(
    () => movimientos.filter((m) => esHoy(m.fecha)),
    [movimientos]
  );

  const totalCategorias = useMemo(
    () => contarCategorias(productos),
    [productos]
  );

  return (
    <div className="inv-page">
      <section className="inv-sales-panel">
        <div className="inv-sales-panel__info">
          <h2>Ventas Square</h2>
          <p>Descuenta ingredientes según recetas y registra movimientos.</p>
        </div>
        <button
          type="button"
          className="inv-sales-panel__btn"
          onClick={onProcesarVentas}
          disabled={procesandoVentas}
        >
          {procesandoVentas ? (
            <>
              <span className="inv-spinner inv-spinner--sm" aria-hidden />
              Procesando…
            </>
          ) : (
            "Procesar ventas"
          )}
        </button>
      </section>

      <section className="inv-dash-cards">
        <div className="inv-dash-card">
          <span className="inv-dash-card__value">{productos.length}</span>
          <span className="inv-dash-card__label">Total productos</span>
        </div>
        <div className="inv-dash-card inv-dash-card--danger">
          <span className="inv-dash-card__value">{bajos.length}</span>
          <span className="inv-dash-card__label">Stock bajo</span>
        </div>
        <div className="inv-dash-card inv-dash-card--accent">
          <span className="inv-dash-card__value">{movimientosHoy.length}</span>
          <span className="inv-dash-card__label">Movimientos hoy</span>
        </div>
        <div className="inv-dash-card">
          <span className="inv-dash-card__value">{totalCategorias}</span>
          <span className="inv-dash-card__label">Categorías</span>
        </div>
      </section>

      {bajos.length > 0 ? (
        <section className="inv-alert-panel">
          <div className="inv-alert-panel__head">
            <h2>Alertas de stock</h2>
            <span className="inv-alert-panel__count">{bajos.length}</span>
          </div>
          <ul className="inv-alert-list">
            {bajos.map((p) => (
              <li key={p.id} className="inv-alert-item">
                <div>
                  <strong>{p.nombre}</strong>
                  {p.categoria ? (
                    <span className="inv-alert-item__cat">{p.categoria}</span>
                  ) : null}
                </div>
                <div className="inv-alert-item__stock">
                  <span className="inv-alert-item__actual">{p.stock_actual}</span>
                  <span className="inv-alert-item__min">/ {p.stock_minimo} mín.</span>
                </div>
              </li>
            ))}
          </ul>
          {onIrInventario ? (
            <button
              type="button"
              className="inv-alert-panel__cta"
              onClick={onIrInventario}
            >
              Ver en inventario
            </button>
          ) : null}
        </section>
      ) : (
        <p className="inv-dash-ok">Todo el stock está por encima del mínimo.</p>
      )}
    </div>
  );
}
