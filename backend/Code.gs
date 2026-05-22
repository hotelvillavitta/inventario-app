/**
 * Inventario Villa Vitta — Web App
 * Compatible con la app React actual.
 *
 * GET  ?action=productos
 * GET  ?action=usuarios
 * GET  ?action=movimientos   (historial)
 *
 * POST { action: "movimiento", producto_id, producto, cambio, nota, usuario }
 * POST { action: "login", usuario, pin }
 *
 * Hojas: productos | movimientos | usuarios
 */

function doGet(e) {
  var action = String((e && e.parameter && e.parameter.action) || "").toLowerCase();

  try {
    if (action === "productos") {
      return jsonResponse_(getProductos_());
    }
    if (action === "usuarios") {
      return jsonResponse_(getUsuariosLista_());
    }
    if (action === "movimientos") {
      return jsonResponse_(getMovimientos_());
    }
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
    if (action === "movimiento") {
      return jsonResponse_(registrarMovimiento_(data));
    }
    if (action === "login") {
      return jsonResponse_(validarLogin_(data));
    }
    return jsonResponse_({ error: "Acción POST no válida: " + action });
  } catch (err) {
    return jsonResponse_({ error: String(err.message || err) });
  }
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    throw new Error('No existe la hoja "' + name + '"');
  }
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

function getProductos_() {
  var rows = sheetToObjects_(getSheet_("productos"));
  return rows.map(function (r) {
    return {
      id: String(r.id != null ? r.id : r.producto_id || ""),
      nombre: String(r.nombre || ""),
      foto: String(r.foto || r.imagen || ""),
      stock_actual: Number(r.stock_actual != null ? r.stock_actual : 0),
      stock_minimo: Number(r.stock_minimo != null ? r.stock_minimo : 0),
      unidad: String(r.unidad || ""),
      categoria: String(r.categoria || ""),
      area: String(r.area || "")
    };
  });
}

function findProductoRow_(sheet, productoId) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function (h) {
    return String(h).trim().toLowerCase();
  });

  var idCol = headers.indexOf("id");
  if (idCol === -1) idCol = headers.indexOf("producto_id");
  if (idCol === -1) return null;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(productoId)) {
      return { row: i + 1, headers: headers, data: data[i] };
    }
  }
  return null;
}

function getUsuariosLista_() {
  var rows = sheetToObjects_(getSheet_("usuarios"));
  return rows.map(function (r) {
    return {
      usuario: String(r.usuario || ""),
      rol: String(r.rol || "")
    };
  });
}

function validarLogin_(data) {
  var usuario = String(data.usuario || "").trim();
  var pin = String(data.pin || "").trim();

  if (!usuario || !pin) {
    return { ok: false, error: "Usuario y PIN requeridos" };
  }

  var rows = sheetToObjects_(getSheet_("usuarios"));
  var found = null;

  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].usuario || "").trim() === usuario) {
      found = rows[i];
      break;
    }
  }

  if (!found) {
    return { ok: false, error: "Usuario no encontrado" };
  }

  if (String(found.pin || "").trim() !== pin) {
    return { ok: false, error: "PIN incorrecto" };
  }

  return {
    ok: true,
    usuario: String(found.usuario),
    rol: String(found.rol || "")
  };
}

function getMovimientos_() {
  var rows = sheetToObjects_(getSheet_("movimientos"));
  var list = rows.map(function (r, index) {
    return {
      id: String(r.id != null ? r.id : index + 1),
      fecha: formatFecha_(r.fecha),
      usuario: String(r.usuario || ""),
      producto: String(r.producto || ""),
      cambio: Number(r.cambio != null ? r.cambio : 0),
      nota: String(r.nota || ""),
      producto_id: String(r.producto_id || "")
    };
  });

  list.sort(function (a, b) {
    return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
  });

  return list;
}

function registrarMovimiento_(data) {
  var productoId = String(data.producto_id || "");
  var cambio = Number(data.cambio);
  var nota = String(data.nota || "");
  var usuario = String(data.usuario || "Empleado");
  var nombreProducto = String(data.producto || "");

  if (!productoId || isNaN(cambio) || cambio === 0) {
    throw new Error("Movimiento inválido");
  }

  var sheetProd = getSheet_("productos");
  var found = findProductoRow_(sheetProd, productoId);

  if (!found) {
    throw new Error("Producto no encontrado: " + productoId);
  }

  var stockCol = found.headers.indexOf("stock_actual");
  if (stockCol === -1) {
    throw new Error('Columna "stock_actual" no encontrada en productos');
  }

  var stockActual = Number(found.data[stockCol]) || 0;
  var nuevoStock = stockActual + cambio;

  sheetProd.getRange(found.row, stockCol + 1).setValue(nuevoStock);

  appendMovimientoRow_({
    fecha: new Date(),
    usuario: usuario,
    producto: nombreProducto,
    cambio: cambio,
    nota: nota,
    producto_id: productoId
  });

  return { ok: true, nuevo_stock: nuevoStock };
}

function appendMovimientoRow_(mov) {
  var sheetMov = getSheet_("movimientos");
  var lastCol = Math.max(sheetMov.getLastColumn(), 1);
  var headers = sheetMov.getRange(1, 1, 1, lastCol).getValues()[0];
  var row = new Array(headers.length);

  for (var c = 0; c < headers.length; c++) row[c] = "";

  function setCol(name, value) {
    var idx = -1;
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).trim().toLowerCase() === name) {
        idx = i;
        break;
      }
    }
    if (idx !== -1) row[idx] = value;
  }

  setCol("fecha", mov.fecha);
  setCol("usuario", mov.usuario);
  setCol("producto", mov.producto);
  setCol("cambio", mov.cambio);
  setCol("nota", mov.nota);
  setCol("producto_id", mov.producto_id);

  sheetMov.appendRow(row);
}
