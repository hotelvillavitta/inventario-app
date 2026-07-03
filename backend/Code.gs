/**
 * Inventario Villa Vitta
 * stock_actual = visual | stock_operativo = recetas/ventas
 *
 * Flujo ventas Square:
 * 1. sincronizarVentasExternas() copia filas nuevas desde hoja externa → ventas_square
 * 2. procesarVentas_() descuenta ingredientes y marca procesado = Sí
 */

function doGet(e) {
  var action = String((e && e.parameter && e.parameter.action) || "").toLowerCase();
  try {
    if (action === "productos") return jsonResponse_(getProductos_());
    if (action === "usuarios") return jsonResponse_(getUsuariosLista_());
    if (action === "movimientos") return jsonResponse_(getMovimientos_());
    return jsonResponse_({ error: "Acción GET no válida: " + action });
  } catch (err) {
    return jsonResponse_({ error: String(err.message || err) });
  }
}

function doPost(e) {
  var data = {};
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse_({ error: "JSON inválido" });
  }
  var action = String(data.action || "").toLowerCase();
  try {
    if (action === "movimiento") return jsonResponse_(registrarMovimiento_(data));
    if (action === "login") return jsonResponse_(validarLogin_(data));
    if (action === "procesar_ventas") return jsonResponse_(procesarVentas_(data));
    if (action === "sincronizar_ventas") {
      return jsonResponse_({ ok: true, resultado: sincronizarVentasExternas() });
    }
    return jsonResponse_({ error: "Acción POST no válida: " + action });
  } catch (err) {
    return jsonResponse_({ error: String(err.message || err) });
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('No existe la hoja "' + name + '"');
  return sh;
}

function normalizeHeader_(h) {
  return String(h).trim().toLowerCase().replace(/\s+/g, "_");
}

function sheetToObjects_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(normalizeHeader_);
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    var empty = true;
    for (var j = 0; j < headers.length; j++) {
      var val = values[i][j];
      if (val !== "" && val != null) empty = false;
      obj[headers[j]] = val;
    }
    if (!empty) rows.push(obj);
  }
  return rows;
}

function formatFecha_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone() || "America/Mexico_City",
      "yyyy-MM-dd'T'HH:mm:ss"
    );
  }
  return String(value || "");
}

function normalizeNombre_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function esSi_(v) {
  var value = String(v || "").trim().toLowerCase();
  return value === "si" || value === "sí";
}

// ——— Productos ———

function getProductos_() {
  return sheetToObjects_(getSheet_("productos")).map(function (r) {
    return {
      id: String(r.id || ""),
      nombre: String(r.nombre || ""),
      categoria: String(r.categoria || ""),
      area: String(r.area || ""),
      unidad: String(r.unidad || ""),
      stock_minimo: Number(r.stock_minimo || 0),
      stock_actual: Number(r.stock_actual || 0),
      foto: String(r.foto || ""),
      stock_operativo: Number(r.stock_operativo || 0),
      unidad_operativa: String(r.unidad_operativa || ""),
    };
  });
}

function findProductoRow_(sheet, productoId) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function (h) {
    return String(h).trim().toLowerCase();
  });
  var idCol = headers.indexOf("id");
  if (idCol === -1) return null;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(productoId)) {
      return { row: i + 1, headers: headers, data: data[i] };
    }
  }
  return null;
}

// ——— Usuarios ———

function getUsuariosLista_() {
  return sheetToObjects_(getSheet_("usuarios")).map(function (r) {
    return { usuario: String(r.usuario || ""), rol: String(r.rol || "") };
  });
}

function validarLogin_(data) {
  var usuario = String(data.usuario || "").trim();
  var pin = String(data.pin || "").trim();
  if (!usuario || !pin) {
    return { ok: false, error: "Usuario y PIN requeridos" };
  }
  var rows = sheetToObjects_(getSheet_("usuarios"));
  for (var i = 0; i < rows.length; i++) {
    if (
      String(rows[i].usuario || "").trim() === usuario &&
      String(rows[i].pin || "").trim() === pin
    ) {
      return { ok: true, usuario: usuario, rol: String(rows[i].rol || "") };
    }
  }
  return { ok: false, error: "PIN incorrecto" };
}

// ——— Movimientos ———

function getMovimientos_() {
  var list = sheetToObjects_(getSheet_("movimientos")).map(function (r, index) {
    return {
      id: String(index + 1),
      fecha: formatFecha_(r.fecha),
      usuario: String(r.usuario || ""),
      producto: String(r.producto || ""),
      cambio: Number(r.cambio || 0),
      nota: String(r.nota || ""),
      producto_id: String(r.producto_id || ""),
    };
  });
  list.sort(function (a, b) {
    return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
  });
  return list;
}

function appendMovimientoRow_(mov) {
  getSheet_("movimientos").appendRow([
    mov.fecha,
    mov.producto_id,
    mov.producto,
    mov.cambio,
    mov.nota,
    mov.usuario,
  ]);
}

// ——— Movimientos manuales ———

function registrarMovimiento_(data) {
  var productoId = String(data.producto_id || "");
  var cambio = Number(data.cambio || 0);
  if (!productoId || cambio === 0) throw new Error("Movimiento inválido");

  var sheet = getSheet_("productos");
  var found = findProductoRow_(sheet, productoId);
  if (!found) throw new Error("Producto no encontrado");

  var headers = found.headers;
  var stockCol = headers.indexOf("stock_actual");
  var opCol = headers.indexOf("stock_operativo");
  var stockActual = Number(found.data[stockCol] || 0);
  var stockOperativo = Number(found.data[opCol] || 0);
  var nuevoStock = stockActual + cambio;

  sheet.getRange(found.row, stockCol + 1).setValue(nuevoStock);

  var contenidoCol = headers.indexOf("contenido_por_unidad");
  var contenido = Number(found.data[contenidoCol] || 0);
  if (contenido > 0) {
    var nuevoOperativo = stockOperativo + cambio * contenido;
    sheet.getRange(found.row, opCol + 1).setValue(nuevoOperativo);
  }

  appendMovimientoRow_({
    fecha: new Date(),
    usuario: String(data.usuario || "Empleado"),
    producto: String(data.producto || ""),
    cambio: cambio,
    nota: String(data.nota || ""),
    producto_id: productoId,
  });

  return { ok: true, nuevo_stock: nuevoStock };
}

// ——— Recetas ———

function buildRecetasMap_() {
  var map = {};
  sheetToObjects_(getSheet_("recetas")).forEach(function (r) {
    var platillo = normalizeNombre_(r.platillo);
    if (!platillo) return;
    if (!map[platillo]) map[platillo] = [];
    map[platillo].push(r);
  });
  return map;
}

// ——— Descontar operativo (ventas) ———

function descontarOperativo_(productoId, cantidad, nota) {
  var sheet = getSheet_("productos");
  var found = findProductoRow_(sheet, productoId);
  if (!found) return;

  var headers = found.headers;
  var opCol = headers.indexOf("stock_operativo");
  var actualCol = headers.indexOf("stock_actual");
  var contenidoCol = headers.indexOf("contenido_por_unidad");
  if (opCol === -1) return;

  var operativoActual = Number(found.data[opCol] || 0);
  var contenido = Number(found.data[contenidoCol] || 0);
  var nuevoOperativo = operativoActual - cantidad;

  sheet.getRange(found.row, opCol + 1).setValue(nuevoOperativo);

  if (contenido > 0) {
    var nuevoActual = Math.round((nuevoOperativo / contenido) * 100) / 100;
    sheet.getRange(found.row, actualCol + 1).setValue(nuevoActual);
  }

  appendMovimientoRow_({
    fecha: new Date(),
    usuario: "Sistema Square",
    producto: found.data[headers.indexOf("nombre")],
    cambio: -cantidad,
    nota: nota,
    producto_id: productoId,
  });
}

// ——— Ventas externas → ventas_square ———

var VENTAS_EXTERNAS_SPREADSHEET_ID =
  "1QLg2Nd9eY34rSd9L2rZIJrdV6g9LUFuFSbEYI55lVvI";

function getVentasExternasSheet_() {
  return SpreadsheetApp.openById(VENTAS_EXTERNAS_SPREADSHEET_ID).getSheetByName(
    "VENTAS"
  );
}

function sincronizarVentasExternas() {
  var externas = getVentasExternasSheet_();
  var internas = getSheet_("ventas_square");
  var extData = externas.getDataRange().getValues();
  if (extData.length < 2) return "Sin ventas externas";

  var intData = internas.getDataRange().getValues();
  var existentes = {};
  for (var i = 1; i < intData.length; i++) {
    var existingOrder = String(intData[i][5] || "").trim();
    if (existingOrder) existentes[existingOrder] = true;
  }

  var agregadas = 0;
  for (var j = 1; j < extData.length; j++) {
    var row = extData[j];
    var orderId = String(row[5] || "").trim();
    if (!orderId || existentes[orderId]) continue;

    internas.appendRow([
      row[0], // Fecha
      row[1], // Producto
      row[2], // Cantidad
      row[3], // Total
      row[4], // Tipo
      row[5], // OrderID
      row[6], // Modificadores
      "", // procesado
      "", // fecha_proceso
      "", // error
    ]);
    agregadas++;
  }

  SpreadsheetApp.flush();
  return agregadas + " ventas sincronizadas";
}

// ——— Procesar ventas ———

function procesarVentas_(data) {
  var syncResult = sincronizarVentasExternas();
  var recetasMap = buildRecetasMap_();
  var ventasSheet = getSheet_("ventas_square");
  var values = ventasSheet.getDataRange().getValues();
  var headers = values[0].map(normalizeHeader_);
  var productoCol = headers.indexOf("producto");
  var cantidadCol = headers.indexOf("cantidad");
  var procesadoCol = headers.indexOf("procesado");

  if (procesadoCol === -1) {
    throw new Error('Agrega columna "procesado" en ventas_square');
  }

  var ventasProcesadas = 0;
  var movimientos = 0;

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (esSi_(row[procesadoCol])) continue;

    var productoVenta = String(row[productoCol] || "").trim();
    if (!productoVenta) continue;

    var cantidadVenta = Number(row[cantidadCol] || 1);
    var receta = recetasMap[normalizeNombre_(productoVenta)];
    if (!receta || receta.length === 0) continue;

    receta.forEach(function (r) {
      var ingredienteId = String(r.ingrediente_id || "");
      if (!ingredienteId) return;
      var cantidad = Number(r.cantidad || 0);
      if (cantidad <= 0) return;
      var total = cantidad * cantidadVenta;
      descontarOperativo_(ingredienteId, total, "Venta Square: " + productoVenta);
      movimientos++;
    });

    ventasSheet.getRange(i + 1, procesadoCol + 1).setValue("Sí");
    ventasProcesadas++;
  }

  return {
    ok: true,
    ventas_procesadas: ventasProcesadas,
    movimientos_generados: movimientos,
    sincronizacion: syncResult,
  };
}

// ——— Reparar inventario ———

function repararInventarioCompleto_() {
  var sheet = getSheet_("productos");
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  var headers = data[0].map(function (h) {
    return String(h).trim().toLowerCase();
  });
  var colOperativo = headers.indexOf("stock_operativo");
  var colActual = headers.indexOf("stock_actual");
  var colContenido = headers.indexOf("contenido_por_unidad");

  for (var i = 1; i < data.length; i++) {
    var operativo = Number(data[i][colOperativo]) || 0;
    var contenido = Number(data[i][colContenido]) || 0;
    if (contenido <= 0) continue;
    var actual = Math.round((operativo / contenido) * 100) / 100;
    sheet.getRange(i + 1, colActual + 1).setValue(actual);
  }

  SpreadsheetApp.flush();
  return "Inventario resincronizado";
}
