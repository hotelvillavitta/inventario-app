import { formatearFecha } from "../utils";

export default function Historial({ movimientos }) {
  if (movimientos.length === 0) {
    return (
      <div className="inv-page">
        <p className="inv-empty">Aún no hay movimientos registrados.</p>
      </div>
    );
  }

  return (
    <div className="inv-page">
      <ul className="inv-hist-list">
        {movimientos.map((m, i) => {
          const entrada = Number(m.cambio) > 0;
          return (
            <li
              key={`${m.id}-${m.fecha}-${i}`}
              className={`inv-hist-item${entrada ? " inv-hist-item--in" : " inv-hist-item--out"}`}
            >
              <div className="inv-hist-item__top">
                <span
                  className={`inv-hist-item__cambio${entrada ? " inv-hist-item__cambio--in" : " inv-hist-item__cambio--out"}`}
                >
                  {entrada ? "+" : ""}
                  {m.cambio}
                </span>
                <time className="inv-hist-item__fecha">
                  {formatearFecha(m.fecha)}
                </time>
              </div>
              <p className="inv-hist-item__producto">{m.producto}</p>
              <p className="inv-hist-item__meta">
                <span>{m.usuario}</span>
                {m.nota ? <span className="inv-hist-item__nota">{m.nota}</span> : null}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
