/**
 * Horario automático — procesar ventas cada hora.
 * Archivo separado para no modificar Code.gs (doGet/doPost).
 *
 * 1. Pega Code.gs completo (sin cambios) + este archivo en Apps Script.
 * 2. Guarda → Implementar → Nueva versión.
 * 3. En la hoja: Inventario → Instalar horario procesar ventas.
 */

var VENTAS_AUTO_USUARIO = "Sistema (automático)";

/** "diario" | "cada_horas" | "cada_minutos" */
var VENTAS_AUTO_TIPO = "cada_horas";
var VENTAS_AUTO_HORA = 23;
var VENTAS_AUTO_CADA_HORAS = 1;
var VENTAS_AUTO_CADA_MINUTOS = 30;

function ventasAutoZona_() {
  return Session.getScriptTimeZone() || "America/Mexico_City";
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Inventario")
    .addItem("Instalar horario procesar ventas", "instalarHorarioProcesarVentas")
    .addItem("Quitar horario procesar ventas", "desinstalarHorarioProcesarVentas")
    .addSeparator()
    .addItem("Procesar ventas ahora", "procesarVentasProgramado_")
    .addToUi();
}

function procesarVentasProgramado_() {
  try {
    var result = procesarVentas_({ usuario: VENTAS_AUTO_USUARIO });
    Logger.log("Ventas automáticas OK: " + JSON.stringify(result));
    return result;
  } catch (err) {
    Logger.log("Ventas automáticas ERROR: " + String(err.message || err));
    throw err;
  }
}

function instalarHorarioProcesarVentas() {
  desinstalarHorarioProcesarVentas_();
  var builder = ScriptApp.newTrigger("procesarVentasProgramado_").timeBased();
  var descripcion = "";

  if (VENTAS_AUTO_TIPO === "cada_horas") {
    builder.everyHours(Math.max(1, VENTAS_AUTO_CADA_HORAS));
    descripcion =
      "cada " + Math.max(1, VENTAS_AUTO_CADA_HORAS) + " hora(s)";
  } else if (VENTAS_AUTO_TIPO === "cada_minutos") {
    builder.everyMinutes(Math.max(1, VENTAS_AUTO_CADA_MINUTOS));
    descripcion =
      "cada " + Math.max(1, VENTAS_AUTO_CADA_MINUTOS) + " minuto(s)";
  } else {
    builder
      .atHour(VENTAS_AUTO_HORA)
      .everyDays(1)
      .inTimezone(ventasAutoZona_());
    descripcion =
      "diario a las " +
      VENTAS_AUTO_HORA +
      ":00 (" +
      ventasAutoZona_() +
      ")";
  }

  builder.create();
  SpreadsheetApp.getUi().alert(
    "Horario instalado",
    "Procesar ventas se ejecutará " + descripcion + ".",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function desinstalarHorarioProcesarVentas() {
  var n = desinstalarHorarioProcesarVentas_();
  SpreadsheetApp.getUi().alert(
    "Horario eliminado",
    n > 0
      ? "Se quitaron " + n + " trigger(s) de procesar ventas."
      : "No había ningún horario activo.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function desinstalarHorarioProcesarVentas_() {
  var eliminados = 0;
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "procesarVentasProgramado_") {
      ScriptApp.deleteTrigger(trigger);
      eliminados++;
    }
  });
  return eliminados;
}
