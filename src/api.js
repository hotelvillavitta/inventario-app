export const API_URL =
  "https://script.google.com/macros/s/AKfycbyEY8gzskN5_S_JhppO7JmSM5jsIZF1YitxlN_R2O_BH5f86i4lA3RNVv7aUTCFkyOkZQ/exec"
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
