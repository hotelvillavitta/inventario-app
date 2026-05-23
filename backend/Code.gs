/**
 * Inventario Villa Vitta — stock sincronizado
 * stock_operativo = fuente física real
 * stock_actual = stock_operativo / contenido_por_unidad (máx. 2 decimales)
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

function getOrCreateSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    return sh;
  }
  if (sh.getLastRow() === 0) sh.appendRow(headers);
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

function colIndex_(headers, names) {
  for (var i = 0; i < names.length; i++) {
    var idx = headers.indexOf(names[i]);
    if (idx !== -1) return idx;
  }
  return -1;
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

function esSi_(value) {
  var v = String(value || "").trim().toLowerCase();
  return v === "sí" || v === "si" || v === "yes" || v === "true" || v === "1";
}

function normalizeNombre_(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ——— Stock sincronizado (ÚNICO punto de mutación) ———
//
// REGLA: stock_operativo es la fuente de verdad.
// stock_actual SOLO se escribe vía recalcularStockActual_ (nunca directo por movimientos).

function redondearStockActual_(valor) {
  return Math.round(Number(valor) * 100) / 100;
}

function getContenidoPorUnidad_(found) {
  var idx = colIndex_(found.headers, ["contenido_por_unidad"]);
  if (idx === -1) return 0;
  return Number(found.data[idx]) || 0;
}

function calcularStockActualDesdeOperativo_(stockOperativo, contenidoPorUnidad) {
  if (!contenidoPorUnidad || contenidoPorUnidad <= 0) return 0;
  return redondearStockActual_(stockOperativo / contenidoPorUnidad);
}

/** Único lugar que escribe stock_actual en la hoja */
function recalcularStockActual_(sheet, found) {
  var opCol = colIndex_(found.headers, ["stock_operativo"]);
  var actCol = colIndex_(found.headers, ["stock_actual"]);
  if (opCol === -1) throw new Error('Columna "stock_operativo" no encontrada');
  if (actCol === -1) throw new Error('Columna "stock_actual" no encontrada');

  var stockOperativo = Number(found.data[opCol]) || 0;
  var contenido = getContenidoPorUnidad_(found);
  if (contenido <= 0) {
    throw new Error("contenido_por_unidad inválido o faltante");
  }

  var nuevoActual = calcularStockActualDesdeOperativo_(stockOperativo, contenido);
  sheet.getRange(found.row, actCol + 1).setValue(nuevoActual);
  found.data[actCol] = nuevoActual;

  return {
    stock_operativo: stockOperativo,
    stock_actual: nuevoActual
  };
}

/** Único lugar que modifica stock_operativo; luego recalcula stock_actual */
function actualizarStockOperativo_(sheet, found, deltaOperativo) {
  var opCol = colIndex_(found.headers, ["stock_operativo"]);
  if (opCol === -1) throw new Error('Columna "stock_operativo" no encontrada');

  var contenido = getContenidoPorUnidad_(found);
  if (contenido <= 0) {
    throw new Error("contenido_por_unidad inválido o faltante");
  }

  var operativo = Number(found.data[opCol]) || 0;
  var nuevoOperativo = operativo + Number(deltaOperativo);

  sheet.getRange(found.row, opCol + 1).setValue(nuevoOperativo);
  found.data[opCol] = nuevoOperativo;

  return recalcularStockActual_(sheet, found);
}

function cambioComercialAOperativo_(cambioComercial, found) {
  var contenido = getContenidoPorUnidad_(found);
  if (contenido <= 0) {
    throw new Error("contenido_por_unidad inválido o faltante");
  }
  return Number(cambioComercial) * contenido;
}

/**
 * Punto único para ventas y movimientos manuales.
 * deltaOperativo: cambio en g/ml/piezas (positivo o negativo)
 */
function mutarInventario_(sheet, found, deltaOperativo, movimientoLog) {
  if (deltaOperativo === 0 || isNaN(deltaOperativo)) {
    throw new Error("Delta operativo inválido");
  }

  var stocks = actualizarStockOperativo_(sheet, found, deltaOperativo);

  if (movimientoLog) {
    appendMovimientoRow_(movimientoLog);
  }

  return stocks;
}

function sincronizarTodasLasFilasProductos_(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  var headers = data[0].map(function (h) {
    return String(h).trim().toLowerCase();
  });

  for (var i = 1; i < data.length; i++) {
    var found = { row: i + 1, headers: headers, data: data[i] };
    try {
      recalcularStockActual_(sheet, found);
      data[i] = found.data;
    } catch (err) {
      // fila sin contenido_por_unidad: no forzar
    }
  }
}

// ——— Productos (columnas exactas) ———

function getProductos_() {
  var sheet = getSheet_("productos");
  sincronizarTodasLasFilasProductos_(sheet);

  return sheetToObjects_(sheet).map(function (r) {
    var operativo = Number(r.stock_operativo != null ? r.stock_operativo : 0);
    var contenido = Number(r.contenido_por_unidad != null ? r.contenido_por_unidad : 0);
    var actual =
      contenido > 0
        ? calcularStockActualDesdeOperativo_(operativo, contenido)
        : 0;

    return {
      id: String(r.id != null ? r.id : ""),
      nombre: String(r.nombre || ""),
      categoria: String(r.categoria || ""),
      area: String(r.area || ""),
      unidad: String(r.unidad || ""),
      stock_minimo: Number(r.stock_minimo != null ? r.stock_minimo : 0),
      stock_actual: actual,
      foto: String(r.foto || ""),
      stock_operativo: operativo,
      contenido_por_unidad: contenido,
      unidad_operativa: String(r.unidad_operativa || "")
    };
  });
}

function findProductoRow_(sheet, productoId) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function (h) {
    return String(h).trim().toLowerCase();
  });
  var idCol = colIndex_(headers, ["id"]);
  if (idCol === -1) return null;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(productoId)) {
      return { row: i + 1, headers: headers, data: data[i] };
    }
  }
  return null;
}

function buildProductosMap_() {
  var map = {};
  var sheet = getSheet_("productos");
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function (h) {
    return String(h).trim().toLowerCase();
  });
  var idCol = colIndex_(headers, ["id"]);
  if (idCol === -1) return map;

  for (var i = 1; i < data.length; i++) {
    var id = String(data[i][idCol]).trim();
    if (!id) continue;
    map[id] = {
      id: id,
      nombre: String(data[i][colIndex_(headers, ["nombre"])] || ""),
      rowInfo: { row: i + 1, headers: headers, data: data[i] }
    };
  }
  return map;
}

// ——— Usuarios / movimientos ———

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
  var found = null;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].usuario || "").trim() === usuario) {
      found = rows[i];
      break;
    }
  }
  if (!found) return { ok: false, error: "Usuario no encontrado" };
  if (String(found.pin || "").trim() !== pin) {
    return { ok: false, error: "PIN incorrecto" };
  }
  return { ok: true, usuario: String(found.usuario), rol: String(found.rol || "") };
}

function getMovimientos_() {
  var list = sheetToObjects_(getSheet_("movimientos")).map(function (r, index) {
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
  var cambioComercial = Number(data.cambio);
  var nota = String(data.nota || "");
  var usuario = String(data.usuario || "Empleado");
  var nombreProducto = String(data.producto || "");

  if (!productoId || isNaN(cambioComercial) || cambioComercial === 0) {
    throw new Error("Movimiento inválido");
  }

  var sheetProd = getSheet_("productos");
  var found = findProductoRow_(sheetProd, productoId);
  if (!found) throw new Error("Producto no encontrado: " + productoId);

  var deltaOperativo = cambioComercialAOperativo_(cambioComercial, found);

  var stocks = mutarInventario_(sheetProd, found, deltaOperativo, {
    fecha: new Date(),
    usuario: usuario,
    producto: nombreProducto,
    cambio: cambioComercial,
    nota: nota,
    producto_id: productoId
  });

  return {
    ok: true,
    nuevo_stock: stocks.stock_actual,
    nuevo_stock_operativo: stocks.stock_operativo
  };
}

function appendMovimientoRow_(mov) {
  var sheetMov = getSheet_("movimientos");
  var lastCol = Math.max(sheetMov.getLastColumn(), 1);
  var headers = sheetMov.getRange(1, 1, 1, lastCol).getValues()[0];
  var row = new Array(headers.length);
  for (var c = 0; c < headers.length; c++) row[c] = "";

  var normHeaders = headers.map(function (h) {
    return String(h).trim().toLowerCase();
  });

  function setCol(name, value) {
    var idx = colIndex_(normHeaders, [name]);
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

function descontarStockOperativo_(prod, cantidadOperativa, usuario, nota) {
  var found = prod.rowInfo;
  if (!found) throw new Error("Producto no encontrado: " + prod.id);

  var sheetProd = getSheet_("productos");
  var qty = Number(cantidadOperativa);
  if (isNaN(qty) || qty <= 0) return;

  mutarInventario_(sheetProd, found, -qty, {
    fecha: new Date(),
    usuario: usuario,
    producto: prod.nombre,
    cambio: -qty,
    nota: nota,
    producto_id: prod.id
  });
}

// ——— Recetas: platillo → ingredientes ———

function buildRecetasPorPlatillo_() {
  var recetas = sheetToObjects_(getSheet_("recetas"));
  var map = {};
  recetas.forEach(function (r) {
    var key = normalizeNombre_(r.platillo);
    if (!key) return;
    if (!map[key]) map[key] = [];
    map[key].push(r);
  });
  return map;
}

function procesarIngredientesReceta_(
  items,
  cantidadPlatillo,
  usuario,
  notaBase,
  productosMap,
  recetasPorPlatillo
) {
  var movimientos = 0;

  items.forEach(function (item) {
    if (esSi_(item.es_subreceta)) {
      var subKey = normalizeNombre_(item.ingrediente);
      var subItems = recetasPorPlatillo[subKey];
      if (!subItems || subItems.length === 0) return;
      var multSub = Number(item.cantidad != null ? item.cantidad : 1) * cantidadPlatillo;
      movimientos += procesarIngredientesReceta_(
        subItems,
        multSub,
        usuario,
        notaBase + " [sub: " + item.ingrediente + "]",
        productosMap,
        recetasPorPlatillo
      );
      return;
    }

    var ingredienteId = String(item.ingrediente_id != null ? item.ingrediente_id : "").trim();
    if (!ingredienteId) return;

    var prod = productosMap[ingredienteId];
    if (!prod) return;

    var cantidadReceta = Number(item.cantidad != null ? item.cantidad : 0);
    if (isNaN(cantidadReceta) || cantidadReceta <= 0) return;

    var totalDescontar = cantidadReceta * cantidadPlatillo;
    if (totalDescontar <= 0) return;

    descontarStockOperativo_(prod, totalDescontar, usuario, notaBase);
    movimientos++;
  });

  return movimientos;
}

// ——— Ventas Square ———

function ensureVentasProcesadasSheet_() {
  getOrCreateSheet_("ventas_procesadas", [
    "OrderID", "Producto", "Cantidad", "fecha_procesado"
  ]);
}

function logVentasProcesadas_(orderId, producto, cantidad) {
  ensureVentasProcesadasSheet_();
  getSheet_("ventas_procesadas").appendRow([
    orderId,
    producto,
    cantidad,
    new Date()
  ]);
}

function procesarVentas_(data) {
  var usuario = String(data.usuario || "Sistema Square");
  var ventasProcesadas = 0;
  var movimientosGenerados = 0;

  ensureVentasProcesadasSheet_();

  var sheetVentas = getSheet_("ventas_square");
  var values = sheetVentas.getDataRange().getValues();
  if (values.length < 2) {
    return { ok: true, ventas_procesadas: 0, movimientos_generados: 0 };
  }

  var headers = values[0].map(normalizeHeader_);
  var colProcesado = colIndex_(headers, ["procesado"]);
  var colFechaProceso = colIndex_(headers, ["fecha_proceso"]);
  var colError = colIndex_(headers, ["error"]);
  var colProducto = colIndex_(headers, ["producto"]);
  var colCantidad = colIndex_(headers, ["cantidad"]);
  var colOrderId = colIndex_(headers, ["orderid"]);

  if (colProducto === -1) throw new Error('Columna "Producto" no encontrada en ventas_square');

  var recetasPorPlatillo = buildRecetasPorPlatillo_();
  var productosMap = buildProductosMap_();

  for (var i = 1; i < values.length; i++) {
    var row = values[i];

    if (colProcesado !== -1 && esSi_(row[colProcesado])) continue;

    var productoVenta = String(row[colProducto] || "").trim();
    if (!productoVenta) continue;

    var cantidadVenta = colCantidad !== -1 ? Number(row[colCantidad]) : 1;
    if (isNaN(cantidadVenta) || cantidadVenta <= 0) cantidadVenta = 1;

    var orderId = colOrderId !== -1 ? String(row[colOrderId] || "").trim() : "fila-" + (i + 1);
    var sheetRow = i + 1;

    try {
      var recetaItems = recetasPorPlatillo[normalizeNombre_(productoVenta)];
      if (!recetaItems || recetaItems.length === 0) {
        if (colError !== -1) {
          sheetVentas.getRange(sheetRow, colError + 1).setValue("Sin receta para: " + productoVenta);
        }
        continue;
      }

      var nota = "Venta Square: " + productoVenta + " (OrderID " + orderId + ")";
      var movs = procesarIngredientesReceta_(
        recetaItems,
        cantidadVenta,
        usuario,
        nota,
        productosMap,
        recetasPorPlatillo
      );

      if (movs === 0) {
        if (colError !== -1) {
          sheetVentas.getRange(sheetRow, colError + 1).setValue("Receta sin ingredientes válidos");
        }
        continue;
      }

      if (colProcesado !== -1) {
        sheetVentas.getRange(sheetRow, colProcesado + 1).setValue("Sí");
      }
      if (colFechaProceso !== -1) {
        sheetVentas.getRange(sheetRow, colFechaProceso + 1).setValue(new Date());
      }
      if (colError !== -1) {
        sheetVentas.getRange(sheetRow, colError + 1).setValue("");
      }

      logVentasProcesadas_(orderId, productoVenta, cantidadVenta);
      ventasProcesadas++;
      movimientosGenerados += movs;
    } catch (err) {
      if (colError !== -1) {
        sheetVentas.getRange(sheetRow, colError + 1).setValue(String(err.message || err));
      }
    }
  }

  return {
    ok: true,
    ventas_procesadas: ventasProcesadas,
    movimientos_generados: movimientosGenerados
  };
}
