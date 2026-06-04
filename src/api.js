export const API_URL =
  "https://script.google.com/macros/s/AKfycbyPiKxbEnnKy_pFoZCWbkMhPd_oT4Jf3Xz5FW6cyLrO3zTAfr5qx38qf_nvINzBKo3vLw/exec;"
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
