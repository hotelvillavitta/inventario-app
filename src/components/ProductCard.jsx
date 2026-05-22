import { useState } from "react";
import { esBajoStock } from "../utils";

const QUICK_ADD = [1, 5, 10];
const QUICK_SUB = [1, 5, 10];

export default function ProductCard({ producto, onMover, moviendo }) {
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
          <p className="inv-stock-row__min">Mínimo: {producto.stock_minimo}</p>
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
