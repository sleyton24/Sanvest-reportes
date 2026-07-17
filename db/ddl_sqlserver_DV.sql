-- DDL tablas planas — unidad DV — SQL Server (producción VPS)
-- Generado de la réplica del ETL. Tipos: del M (TransformColumnTypes)
-- cuando existen; inferidos del dato en columnas no casteadas.
-- Ejecutar en la base destino. Dev usa SQLite vía SQLAlchemy (to_sql).

IF OBJECT_ID('dbo.amortizacion', 'U') IS NOT NULL DROP TABLE dbo.amortizacion;
CREATE TABLE dbo.amortizacion (  -- modelo: "Amortizacion"
    [Proyecto] NVARCHAR(255) NULL,
    [Amortizado] FLOAT NULL,
    [Saldo] FLOAT NULL,
    [Fecha] DATE NULL,
    [FechaID] BIGINT NULL
);

IF OBJECT_ID('dbo.dv_construccion', 'U') IS NOT NULL DROP TABLE dbo.dv_construccion;
CREATE TABLE dbo.dv_construccion (  -- modelo: "DV Construccion"
    [Mes de carga ] BIGINT NULL,
    [Año de carga] BIGINT NULL,
    [Tipo de datos] NVARCHAR(255) NULL,
    [Nombre proyecto] NVARCHAR(255) NULL,
    [Versión] NVARCHAR(255) NULL,
    [AVANCE_CONSTRUCCIÓN] FLOAT NULL,
    [INCIDENCIA_CONSTRUCCIÓN_(UF/M2 LOSA)] FLOAT NULL,
    [COSTOS_TOTALES_PROYECTO_NETO (UF)] FLOAT NULL,
    [COSTO_TOTAL/M2_VENDIBLE_(UF/M2)] FLOAT NULL,
    [COSTO_TOTAL_PROYECTO_(UF)] FLOAT NULL,
    [%LINEA/COSTO_TOTAL_NETO] FLOAT NULL,
    [DEUDA_A_LA_FECHA UF] FLOAT NULL,
    [Periodo] DATE NULL,
    [Fecha ID ] BIGINT NULL
);

IF OBJECT_ID('dbo.dv_escrituras', 'U') IS NOT NULL DROP TABLE dbo.dv_escrituras;
CREATE TABLE dbo.dv_escrituras (  -- modelo: "DV Escrituras"
    [Mes de carga] BIGINT NULL,
    [Año de carga] BIGINT NULL,
    [Tipo de datos] NVARCHAR(255) NULL,
    [Nombre proyecto] NVARCHAR(255) NULL,
    [Versión] NVARCHAR(255) NULL,
    [VENTAS_ACUMULADAS] FLOAT NULL,
    [UF_RECAUDADAS         ] FLOAT NULL,
    [UF_POR_RECAUDAR] FLOAT NULL,
    [PROYECCIÓN_VENTA_TOTAL(UF)] FLOAT NULL,
    [UNIDADES_ESCRITURADAS_RECAUDADAS] BIGINT NULL,
    [UNIDADES_ESCRITURADAS_FIRMADAS] BIGINT NULL,
    [RESERVAS_Y_PROMESAS] FLOAT NULL,
    [Periodo] DATE NULL,
    [Fehca ID ] BIGINT NULL
);

IF OBJECT_ID('dbo.dv_evolucion_de_costos', 'U') IS NOT NULL DROP TABLE dbo.dv_evolucion_de_costos;
CREATE TABLE dbo.dv_evolucion_de_costos (  -- modelo: "DV Evolucion de costos"
    [Mes de carga] BIGINT NULL,
    [Año de carga] BIGINT NULL,
    [Tipo de datos] NVARCHAR(255) NULL,
    [Nombre proyecto] NVARCHAR(255) NULL,
    [Año] BIGINT NULL,
    [mes] BIGINT NULL,
    [Periodo] DATE NULL,
    [PPTO_DE_COSTOS] FLOAT NULL,
    [PROYECCIÓN_DE_COSTOS] FLOAT NULL,
    [COSTOS_REALES] FLOAT NULL,
    [Fecha Id] BIGINT NULL
);

IF OBJECT_ID('dbo.dv_indicadores_financieros', 'U') IS NOT NULL DROP TABLE dbo.dv_indicadores_financieros;
CREATE TABLE dbo.dv_indicadores_financieros (  -- modelo: "DV Indicadores Financieros"
    [Mes] BIGINT NULL,
    [Año] BIGINT NULL,
    [Tipo de datos] NVARCHAR(255) NULL,
    [Nombre proyecto] NVARCHAR(255) NULL,
    [Versión] NVARCHAR(255) NULL,
    [Margen_%_(UT/CT)] FLOAT NULL,
    [Margen_%_(UT/VT)] FLOAT NULL,
    [Margen_proyecto_UF] FLOAT NULL,
    [Inversion Sanvest] FLOAT NULL,
    [Inversion_total_BNV_(UF)] FLOAT NULL,
    [Participacion_BNV_en_sociedad (%)] FLOAT NULL,
    [Margen_BNV_AI_(UF)] FLOAT NULL,
    [ROI_BNV_AI] FLOAT NULL,
    [TIR_BNV_AI] FLOAT NULL,
    [Periodo] DATE NULL,
    [fecha ID ] BIGINT NULL
);

IF OBJECT_ID('dbo.dv_kpis', 'U') IS NOT NULL DROP TABLE dbo.dv_kpis;
CREATE TABLE dbo.dv_kpis (  -- modelo: "DV KPIS"
    [Mes] BIGINT NULL,
    [Año] BIGINT NULL,
    [Tipo de datos] NVARCHAR(255) NULL,
    [Nombre proyecto] NVARCHAR(255) NULL,
    [Versión] NVARCHAR(255) NULL,
    [VENTAS NETAS_DEL_MES] FLOAT NULL,
    [UNIDADES_VENDIDAS] FLOAT NULL,
    [AVANCE_VENTAS_(UNIDADES)%] FLOAT NULL,
    [UF/M2_VENTA] FLOAT NULL,
    [UNIDADES TOTALES] BIGINT NULL,
    [Periodo] DATE NULL,
    [Fecha ID] BIGINT NULL
);

IF OBJECT_ID('dbo.dv_uso_y_fondo', 'U') IS NOT NULL DROP TABLE dbo.dv_uso_y_fondo;
CREATE TABLE dbo.dv_uso_y_fondo (  -- modelo: "DV Uso y Fondo"
    [Mes de carga] BIGINT NULL,
    [Año de carga] BIGINT NULL,
    [Tipo de datos] NVARCHAR(255) NULL,
    [Nombre proyecto] NVARCHAR(255) NULL,
    [Categoria] NVARCHAR(255) NULL,
    [SUBCATEGORIA] NVARCHAR(255) NULL,
    [Monto] FLOAT NULL,
    [Fecha] DATE NULL,
    [Fecha ID] BIGINT NULL
);

IF OBJECT_ID('dbo.dv_ventas', 'U') IS NOT NULL DROP TABLE dbo.dv_ventas;
CREATE TABLE dbo.dv_ventas (  -- modelo: "DV Ventas"
    [Mes de carga] BIGINT NULL,
    [Año de carga] BIGINT NULL,
    [Tipo de datos] NVARCHAR(255) NULL,
    [Nombre proyecto] NVARCHAR(255) NULL,
    [Versión] NVARCHAR(255) NULL,
    [VENTAS_ACUMULADAS] FLOAT NULL,
    [UF_RECAUDADAS         ] FLOAT NULL,
    [UF_POR_RECAUDAR] FLOAT NULL,
    [PROYECCIÓN_VENTA_TOTAL(UF)] FLOAT NULL,
    [UNIDADES_ESCRITURADAS_RECAUDADAS] BIGINT NULL,
    [UNIDADES_ESCRITURADAS_FIRMADAS] BIGINT NULL,
    [RESERVAS_Y_PROMESAS] FLOAT NULL,
    [Año Mes ] DATE NULL,
    [Fecha ID ] BIGINT NULL
);

IF OBJECT_ID('dbo.fecha_aux', 'U') IS NOT NULL DROP TABLE dbo.fecha_aux;
CREATE TABLE dbo.fecha_aux (  -- modelo: "FECHA AUX"
    [Año] BIGINT NULL,
    [mes] BIGINT NULL,
    [Periodo] DATE NULL,
    [Fecha ID ] BIGINT NULL
);

IF OBJECT_ID('dbo.financieros_sanvest', 'U') IS NOT NULL DROP TABLE dbo.financieros_sanvest;
CREATE TABLE dbo.financieros_sanvest (  -- modelo: "Financieros Sanvest"
    [Activo] NVARCHAR(255) NULL,
    [Inversión Sanvest] FLOAT NULL,
    [Participación Sanvest] FLOAT NULL,
    [Margen % (UT/CT)] FLOAT NULL,
    [Margen % (UT/VTA)] FLOAT NULL,
    [Margen Sanvest UF] FLOAT NULL,
    [TIR Sanvest] FLOAT NULL,
    [ROI Sanvest] FLOAT NULL,
    [Margen Proyecto UF] FLOAT NULL,
    [UF/m2 Venta Dpto Ev. Original] FLOAT NULL,
    [UF/m2 venta total EV. Original] FLOAT NULL,
    [UF/m2 Venta Dpto actual] FLOAT NULL,
    [UF/m2 venta total actual] FLOAT NULL,
    [Incidencia construcción (UF/m2 losa)] FLOAT NULL,
    [Costo total neto /m2 vendible (UF/m2)] FLOAT NULL
);
