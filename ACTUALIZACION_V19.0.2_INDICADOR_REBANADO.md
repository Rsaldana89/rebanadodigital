# CHC Rebanado Digital 19.0.2

## Indicador de producto rebanado

- Un vale muestra un badge pequeño `Rebanado disponible` cuando todos sus productos pueden cubrirse con el inventario rebanado que queda.
- Si la cobertura es parcial, el indicador se muestra junto a cada producto: `Disponible`, `2/5 disponible` o `Por rebanar`.
- Al cambiar un vale a `Listo`, el rebanado correspondiente queda apartado por SKU y deja de ofrecerse como disponible a los demás vales.
- Los apartados se asignan por el momento en que cada vale entró a `Listo`.
- Al regresar, cancelar o entregar el vale, el apartado deja de participar automáticamente. La entrega continúa generando la salida real de inventario.
- Si no existe producto rebanado utilizable para un vale, no se muestra ningún indicador y no se bloquea ninguna operación.
- El cálculo usa exclusivamente el SKU; las variaciones de descripción no afectan el resultado.

No requiere migración de base de datos. El estado `Listo`, el historial y las existencias actuales permiten calcular el apartado dinámicamente.
