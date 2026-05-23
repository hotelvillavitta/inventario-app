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

```
mutarInventario_(-cantidad_receta × cantidad_venta)
```

Misma arquitectura que movimientos manuales.

## GET productos

Sincroniza todas las filas en hoja antes de responder (corrige desfases previos).
