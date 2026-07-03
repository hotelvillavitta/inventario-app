export const API_URL =
"https://script.google.com/macros/s/AKfycbwfWC-lfvpPk_mgTd_apK033IoWJoXJOQfuAVt3rJrodV54ZeUw6YOUeEYLigcfbulmhw/exec";
async function parseJson(res) {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    if (/doGet|doPost/i.test(text)) {
      throw new Error(
        "El backend no responde: falta doGet/doPost en Apps Script. Pega todo Code.gs y vuelve a desplegar la app web."
      );
    }
    throw new Error(
      "Respuesta inválida del servidor. Revisa que la app web esté desplegada y accesible."
    );
  }
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
