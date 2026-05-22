# Backend — Google Apps Script

## Hojas en Google Sheets

| Hoja | Columnas |
|------|----------|
| `productos` | id, nombre, foto, stock_actual, stock_minimo, unidad, categoria, area |
| `movimientos` | fecha, usuario, producto, cambio, nota, producto_id |
| `usuarios` | usuario, pin, rol |

## Despliegue

1. Abre tu Google Sheet → **Extensiones** → **Apps Script**.
2. Pega el contenido de `Code.gs` (reemplaza o fusiona con tu script actual).
3. **Implementar** → **Nueva implementación** → Tipo: **Aplicación web**.
4. Ejecutar como: **Yo** · Acceso: **Cualquiera**.
5. Copia la URL y actualízala en `src/api.js` si cambió.

## Endpoints

### GET

- `?action=productos` — lista de productos (compatible con la app anterior)
- `?action=usuarios` — lista `{ usuario, rol }` (sin PIN)
- `?action=movimientos` — historial ordenado del más reciente al más antiguo

### POST

```json
{ "action": "login", "usuario": "Ana", "pin": "1234" }
```

Respuesta: `{ "ok": true, "usuario": "Ana", "rol": "cocina" }` o `{ "ok": false, "error": "..." }`

```json
{
  "action": "movimiento",
  "producto_id": "1",
  "producto": "Aceite",
  "cambio": -2,
  "nota": "merma",
  "usuario": "Ana"
}
```

Respuesta: `{ "ok": true, "nuevo_stock": 8 }`
