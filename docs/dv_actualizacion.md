# Guía de Actualización Mensual — Desarrollo para la Venta (skill DV)

> Referencia para la transformación crudos → tablas planas DV (Fase 4 DV).
> Equivalente al transform LAR (`etl/informes_lar.py`). Provista por el usuario.

**Proyectos:** Millalongo (MI.72 / ML), Santa Victoria 99 (SV.99), Santa Victoria 155 (SV.155)
**Archivo maestro:** `Desarrollo_para_la_venta.xlsx` (salida). **Frecuencia:** mensual (1 fila nueva por proyecto por hoja).

## 1. Inputs
| Archivo | Contenido | Obligatorio |
|---|---|---|
| `Desarrollo_para_la_venta.xlsx` | salida a actualizar | Sí |
| `Rentabilidad_Inversiones_Proyectos.xlsx` | flujos mensuales: Socio (D), Danacorp (F), Ventas (H) | Sí |
| `Estadística_de_Ventas.xlsx` | snapshot acumulado: Precio Venta, Pagado, Por Pagar, conteo unidades | Sí |
| `Informe_Mensual_de_Ventas_SV.xlsx` | ventas del mes (unid y UF) por bloques mensuales | Sí |
| `Informe_Escrituración_y_Venta — MI 72` | Escrituras / Promesas / Ofertas | Solo ML |
| `Ingreso_por_proyecto` | detalle transaccional ingresos | Opcional (cross-check) |

## 2. Flujo
1. Mes a cargar = último `FechaID` (YYYYMM) en DV USOS Y FONDOS + 1.
2. Extraer (sección 3). 3. Cross-check (5). 4. Escribir filas nuevas (copiar formato última fila).
5. Marcar ROJO los manuales pendientes (4). 6. Validar (6).

## 3. Origen de cada dato
### DV USOS Y FONDOS
- **Egresos**: Egresos mes anterior + Rentabilidad.Socio(D) + Rentabilidad.Danacorp(F). Acumulativo.
- **Línea Crédito ML**: congelada 225.597 (pagada desde 202504).
- **Línea Crédito SV99**: congelada 318.709 (pagada desde 202306).
- **Línea Crédito SV155**: **MANUAL** (giros banco, externo). ROJO si no llegó.
- **Preventas ML**: congelada 24.118 (desde 202504). **Preventas SV99**: congelada 56.171,56 (desde 202305).
- **Preventas SV155**: Estadística → Pagado (aún en preventa).
- **Capital Socios**: residual = Egresos − Línea − Preventas. ROJO si Línea en rojo.

### DV Escrituras
| Campo | ML | SV99 | SV155 |
|---|---|---|---|
| VtasAcumuladas | Informe Mensual → TOTAL VENDIDO (UF) | Estadística → Precio Venta | Estadística → Precio Venta |
| UF Recaudadas | Escrituración → Resumen → Pagado | Estadística → Pagado (sin multas) | idem |
| UF Por Recaudar | VtasAcum − Recaudadas | Estadística → Por Pagar | idem |
| ProyVtaTotal | 583.384,41 (cte) | 668.850,08 (cte) | 689.846 (cte) |
| EscRec / EscFirm / ResProm | Escrituración: Escrituras / Promesas / Ofertas (unids) | Estadística | Estadística |

### DV Ventas
Igual a Escrituras, salvo: ProyVtaTotal SV155 = **660.148,80** (no 689.846); ML solo REAL (sin PPTO).

### DV KPIS
- **VtasNetasMes**: Informe Mensual → VENTAS DEL MES → Deptos Unid. PPTO ML = 5,1 cte.
- **UnidsVendidas**: acumulado anterior + VtasNetasMes.
- **Avance %**: UnidsVend / total (ML 153, SV99 145, SV155 154).
- **UF/m²**: ML 73,4 — SV99 y SV155 66,253.

### DV Reservas
- **REAL** = KPIS UnidsVendidas (exacto). **PPTO**: copiar mes anterior. %: / total unidades.

### Construcción / Indicadores Financieros
Sin avance de obra nuevo → replicar mes anterior cambiando solo mes/período. Avance llega manual.

### Amortización
| Proy | Amortizado | Saldo |
|---|---|---|
| ML | 225.597 | 0 | 
| SV99 | 318.709 | 0 |
| SV155 | 0 | = Línea actual (rojo si Línea en rojo) |

## 4. Datos manuales (fuente ROJA = pendiente de dato real)
Línea SV155 (giros banco) · Capital SV155 (residual) · Avance obra · PPTO Reservas. Al llegar el dato real, se actualiza y se quita el rojo.

## 5. Cross-check (antes de escribir)
- Rentabilidad.Ventas ≈ Ingreso.Ventas (<1 UF)
- Rentabilidad.Danacorp ≈ Ingreso.Cta Corriente (<1 UF)
- Rentabilidad.Socio ≈ Ingreso.Gastos Generales (<50 UF; Socio incluye extras, ~10% normal)
- Estadística.PrecioVenta ≈ Informe Mensual.TOTAL VENDIDO ML (<1 UF)
- Unidades coherentes entre Informe Mensual / Estadística / Escrituración

## 6. Validaciones finales (tolerancia cero)
1. USOS Y FONDOS: Egresos = Línea + Preventas + Capital
2. KPIS UnidsVend = Reservas REAL
3. Escrituras vs Ventas: mismos VtasAcum y Recaud (solo difiere ProyVtaTotal)
4. Evolución de Costos: Costos Reales = Egresos / 1000

## 7. Congelamiento
- Preventas se congelan al empezar escrituras (1er mes con EscRec>0); valor fijo del último mes con EscRec=0.
- Línea de Crédito se congela cuando no hay más giros (ML, SV99 pagadas; SV155 sigue).
