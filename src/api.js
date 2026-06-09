export const API_URL =
"https://script.google.com/macros/s/AKfycbxmHMyZJLhBRsYzmQbX4hAtUKTB1c4f-2UiCNw-_lUjPMJjULibSVGsA6wWB4UHy0el7w/exec";
  async function parseJson(res) {
  const data = await res.json();
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function fetchProductos() {
  const res = await fetch(`${API_URL}?action=productos`);
  const data = await parseJson(res);
  return Array.isArray(data) ? data : [];
}

export async function fetchUsuarios() {
  const res = await fetch(`${API_URL}?action=usuarios`);
  const data = await parseJson(res);
  return Array.isArray(data) ? data : [];
}

export async function fetchMovimientos() {
  const res = await fetch(`${API_URL}?action=movimientos`);
  const data = await parseJson(res);
  return Array.isArray(data) ? data : [];
}

export async function login(usuario, pin) {
  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "login", usuario, pin }),
  });
  return parseJson(res);
}

export async function procesarVentas(usuario) {
  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "procesar_ventas", usuario }),
  });
  return parseJson(res);
}

export async function registrarMovimiento(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "movimiento", ...payload }),
  });
  return parseJson(res);
}
