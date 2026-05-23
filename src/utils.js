export const TAB_TODAS = "Todas";
export const AREA_TODAS = "Todas";

export function esBajoStock(producto) {
  const min = Number(producto.stock_minimo);
  const actual = Number(producto.stock_actual);
  if (Number.isNaN(min) || Number.isNaN(actual)) return false;
  return actual <= min;
}

export function parseFecha(fecha) {
  if (!fecha) return null;
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function esHoy(fecha) {
  const d = parseFecha(fecha);
  if (!d) return false;
  const hoy = new Date();
  return (
    d.getDate() === hoy.getDate() &&
    d.getMonth() === hoy.getMonth() &&
    d.getFullYear() === hoy.getFullYear()
  );
}

export function formatearFecha(fecha) {
  const d = parseFecha(fecha);
  if (!d) return String(fecha || "");
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function contarCategorias(productos) {
  const set = new Set();
  productos.forEach((p) => {
    if (p.categoria) set.add(p.categoria);
  });
  return set.size;
}

/** Máximo 2 decimales para stock comercial */
export function formatStockActual(valor) {
  const n = Number(valor);
  if (Number.isNaN(n)) return "0";
  return String(Number(n.toFixed(2)));
}

/** Misma fórmula que Apps Script: movimiento manual en unidades comerciales */
export function stocksTrasMovimientoComercial(producto, cambioComercial) {
  const contenido = Number(producto.contenido_por_unidad) || 0;
  if (contenido <= 0) return null;
  const deltaOp = Number(cambioComercial) * contenido;
  const stock_operativo = (Number(producto.stock_operativo) || 0) + deltaOp;
  const stock_actual = Math.round((stock_operativo / contenido) * 100) / 100;
  return { stock_actual, stock_operativo };
}
