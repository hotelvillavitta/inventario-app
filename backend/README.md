# Inventario sincronizado

## Fórmula

```
stock_actual = redondear(stock_operativo / contenido_por_unidad, 2 decimales)
```

**stock_operativo** = fuente física real (g, ml, piezas)  
**stock_actual** = unidades comerciales (bolsas, litros fraccionados)

## productos

`contenido_por_unidad` · `unidad_operativa` · `stock_operativo` · `stock_actual` · `unidad` · …

## Flujo único (`mutarInventario_`)

1. `delta_operativo` → `actualizarStockOperativo_` (solo escribe operativo)
2. `recalcularStockActual_` (único lugar que escribe `stock_actual`)

## Movimiento manual

```
delta_operativo = cambio_comercial × contenido_por_unidad
mutarInventario_(delta_operativo)
```

Historial guarda `+1`, `-0.5` (comercial). Inventario siempre en operativo.

## Ventas

Flujo al pulsar **Procesar ventas** (o el horario automático):

1. **`sincronizarVentasExternas()`** — copia ventas nuevas desde la hoja externa Square (`VENTAS`) → `ventas_square` (por `OrderID`, sin duplicar).
2. **`procesarVentas_()`** — para filas con `procesado` vacío, busca receta por `platillo`, descuenta `stock_operativo` y marca `procesado = Sí`.

Hoja externa (ID en `VENTAS_EXTERNAS_SPREADSHEET_ID`): pestaña **`VENTAS`**.

Columnas esperadas en ambas hojas (mismo orden): Fecha, Producto, Cantidad, Total, Tipo, OrderID, Modificadores.

### Horario automático (procesar ventas)

El horario está en un **archivo aparte** (`HorarioVentas.gs`) para no tocar `Code.gs` ni romper la app web.

**Archivos en Apps Script:**

| Archivo | Contenido |
|---------|-----------|
| `Code.gs` | Backend completo (`doGet`, `doPost`, inventario, ventas) — **no modificar** salvo bugs |
| `HorarioVentas.gs` | Trigger cada hora + menú **Inventario** en la hoja |

**Pasos para recuperar la app y activar el horario:**

1. En Apps Script, abre `Code.gs` y pega **todo** el contenido de `backend/Code.gs` (debe empezar con `function doGet`).
2. Crea un archivo nuevo **HorarioVentas** y pega `backend/HorarioVentas.gs`.
3. **Guardar** → **Implementar → Administrar implementaciones → Editar → Nueva versión → Implementar**.
4. Recarga la app React: el inventario debe cargar.
5. En la hoja: **Inventario → Instalar horario procesar ventas** (cada hora, configurado en `HorarioVentas.gs`).

Configuración en `HorarioVentas.gs` (`VENTAS_AUTO_TIPO = "cada_horas"`, `VENTAS_AUTO_CADA_HORAS = 1`).

Si la app dice "falta doGet", pegaste solo parte del código o no creaste nueva versión del despliegue.

## GET productos

Sincroniza todas las filas en hoja antes de responder (corrige desfases previos).
