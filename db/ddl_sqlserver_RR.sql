-- DDL tablas planas — unidad RR — SQL Server (producción VPS)
-- Generado de la réplica del ETL. Tipos: del M (TransformColumnTypes)
-- cuando existen; inferidos del dato en columnas no casteadas.
-- Ejecutar en la base destino. Dev usa SQLite vía SQLAlchemy (to_sql).

IF OBJECT_ID('dbo.indicadores_financieros', 'U') IS NOT NULL DROP TABLE dbo.indicadores_financieros;
CREATE TABLE dbo.indicadores_financieros (  -- modelo: "Indicadores Financieros"
    [Mes de carga] BIGINT NULL,
    [Año de carga] BIGINT NULL,
    [Nombre activo] NVARCHAR(255) NULL,
    [Item] NVARCHAR(255) NULL,
    [Item 2] NVARCHAR(255) NULL,
    [Periodo] DATE NULL,
    [mes] BIGINT NULL,
    [anio] BIGINT NULL,
    [Versión_Real] FLOAT NULL,
    [Versión_Ppto] FLOAT NULL,
    [Versión_Proyección] FLOAT NULL,
    [Indice] BIGINT NULL,
    [YTD REAL] FLOAT NULL,
    [YTD PPTO] FLOAT NULL,
    [Indice2] BIGINT NULL,
    [FechaID] BIGINT NULL
);

IF OBJECT_ID('dbo.indicadores_financieros_lar', 'U') IS NOT NULL DROP TABLE dbo.indicadores_financieros_lar;
CREATE TABLE dbo.indicadores_financieros_lar (  -- modelo: "Indicadores Financieros Lar"
    [Nombre activo] NVARCHAR(255) NULL,
    [Nivel 1 ] NVARCHAR(255) NULL,
    [Nivel 2] NVARCHAR(255) NULL,
    [Periodo] DATE NULL,
    [Mes] BIGINT NULL,
    [Año] BIGINT NULL,
    [Real Peso] FLOAT NULL,
    [PPTO Peso] FLOAT NULL,
    [Versión_Real] FLOAT NULL,
    [Versión_Ppto] FLOAT NULL,
    [YTD REAL] FLOAT NULL,
    [YTD PPTO] FLOAT NULL,
    [UF Mes] FLOAT NULL,
    [UF Mes PPTO] FLOAT NULL,
    [Indice] BIGINT NULL,
    [FechaID] BIGINT NULL
);

IF OBJECT_ID('dbo.rr_edificios_lar', 'U') IS NOT NULL DROP TABLE dbo.rr_edificios_lar;
CREATE TABLE dbo.rr_edificios_lar (  -- modelo: "RR Edificios LAR"
    [Fecha ID] BIGINT NULL,
    [Activo] NVARCHAR(255) NULL,
    [MES 2] BIGINT NULL,
    [Año] BIGINT NULL,
    [Mes ] NVARCHAR(255) NULL,
    [Superficie Total Arrendable] FLOAT NULL,
    [Cantidad Deptos] FLOAT NULL,
    [Ocupación Deptos (%)] FLOAT NULL,
    [Superficie Total Ocupada] FLOAT NULL,
    [Arriendos Deptos (UF/mes)] FLOAT NULL,
    [Arriendo Deptos (UF/m2)(**)] FLOAT NULL,
    [Arriendo Deptos (UF/uni)] FLOAT NULL,
    [Ocupación Estacionamientos (%)] FLOAT NULL,
    [Arriendos Estacionamientos (UF/mes)] FLOAT NULL,
    [Arriendo Estacionamientos (UF/uni)] FLOAT NULL,
    [Arriendo Deptos + Estacio. (UF/m2)] FLOAT NULL,
    [Ingresos Gasto Común (UF/mes)] FLOAT NULL,
    [Ingresos Gasto Común (UF/m2)] FLOAT NULL,
    [Ingresos Gasto Común (UF/uni)] FLOAT NULL,
    [Ingresos Gasto Común ($/m2)] FLOAT NULL,
    [Cuota Banco (UF)] FLOAT NULL,
    [EBITDA AJUSTADO/CUOTA BANCO] FLOAT NULL,
    [Morosidad 0-30 días (UF)] FLOAT NULL,
    [Morosidad 31-60 días (UF)] FLOAT NULL,
    [Morosidad 61-90+ días (UF)] FLOAT NULL,
    [Morosidad 91-120+ días (UF)] FLOAT NULL
);

IF OBJECT_ID('dbo.rr_kpis', 'U') IS NOT NULL DROP TABLE dbo.rr_kpis;
CREATE TABLE dbo.rr_kpis (  -- modelo: "RR KPis"
    [mes carga] BIGINT NULL,
    [anio carga] BIGINT NULL,
    [Nombre activo] NVARCHAR(255) NULL,
    [Versión] NVARCHAR(255) NULL,
    [CONTRATOS POR VENCER ESTE MES] NVARCHAR(255) NULL,
    [UNIDADES ARRENDADAS] BIGINT NULL,
    [OCUPACIÓN DEPTOS] FLOAT NULL,
    [OCUPACIÓN DEPARTAMENTOS_YTD] FLOAT NULL,
    [UF/M2_DEPARTAMENTOS] FLOAT NULL,
    [UF/M2_YTD] FLOAT NULL,
    [UF/ESTACIONAMIENTO] FLOAT NULL,
    [UF/ESTACIONAMIENTO_YTD] FLOAT NULL,
    [UF/M2 (DEPTO+ESTAC.)] FLOAT NULL,
    [UF/M2 (DEPTO+ESTAC.)_YTD] FLOAT NULL,
    [Periodo] DATE NULL
);

IF OBJECT_ID('dbo.real_ppto_ly', 'U') IS NOT NULL DROP TABLE dbo.real_ppto_ly;
CREATE TABLE dbo.real_ppto_ly (  -- modelo: "Real+PPTO+LY"
    [Periodo] DATE NULL,
    [Activo] NVARCHAR(255) NULL,
    [Ingresos totales UF p] FLOAT NULL,
    [Costos operacionales UF p] FLOAT NULL,
    [EBITDA UF p] FLOAT NULL,
    [Flujo UF p] FLOAT NULL,
    [EBITDA UF/CUOTA BANCO p] FLOAT NULL,
    [Ocupación departamentos 2022 (%) p] FLOAT NULL,
    [EBITDA UF/VENTAS p] FLOAT NULL,
    [Ingresos totales UF YTD p] FLOAT NULL,
    [Costos operacionales UF YTD p] FLOAT NULL,
    [EBITDA UF YTD p] FLOAT NULL,
    [Flujo UF YTD p] FLOAT NULL,
    [Año p] BIGINT NULL,
    [Mes p] BIGINT NULL,
    [Ingresos totales UF R] FLOAT NULL,
    [Costos operacionales UF R] FLOAT NULL,
    [EBITDA UF R] FLOAT NULL,
    [Flujo UF R] FLOAT NULL,
    [EBITDA UF/CUOTA BANCO R] FLOAT NULL,
    [Ocupación departamentos 2022 (%) R] FLOAT NULL,
    [Ingresos totales UF YTD R] FLOAT NULL,
    [Costos operacionales UF YTD R] FLOAT NULL,
    [EBITDA UF YTD R] FLOAT NULL,
    [Flujo UF YTD R] FLOAT NULL,
    [Año] BIGINT NULL,
    [Mes] BIGINT NULL,
    [LY fecha] DATE NULL,
    [Check] FLOAT NULL,
    [Ingresos totales UF R LY] FLOAT NULL,
    [Costos operacionales UF LY] FLOAT NULL,
    [EBITDA UF R LY] FLOAT NULL,
    [Flujo UF R LY] FLOAT NULL,
    [EBITDA UF/CUOTA BANCO R LY] FLOAT NULL,
    [Ocupación departamentos 2022 (%) R7 LY] FLOAT NULL,
    [EBITDA UF/VENTAS R LY] FLOAT NULL,
    [Gastos Comunes (UF/M2) R] FLOAT NULL,
    [Gastos Comunes (UF/M2) P] FLOAT NULL,
    [UF/M2_DEPARTAMENTOS R ] FLOAT NULL,
    [UF/M2_YTD R] FLOAT NULL,
    [UF/ESTACIONAMIENTO R] FLOAT NULL,
    [UF/ESTACIONAMIENTO_YTD R] FLOAT NULL,
    [UF/M2 (DEPTO+ESTAC.) R] FLOAT NULL,
    [UF/M2 (DEPTO+ESTAC.)_YTD R] FLOAT NULL,
    [Fecha ID] BIGINT NULL,
    [UF/M2_DEPARTAMENTOS p] FLOAT NULL,
    [UF/M2_YTD p] FLOAT NULL,
    [UF/ESTACIONAMIENTO p] FLOAT NULL,
    [UF/ESTACIONAMIENTO_YTD p] FLOAT NULL,
    [UF/M2 (DEPTO+ESTAC.) p] FLOAT NULL,
    [UF/M2 (DEPTO+ESTAC.)_YTD p] FLOAT NULL,
    [Tarifa LY] FLOAT NULL,
    [Gasto comun LY] FLOAT NULL
);

IF OBJECT_ID('dbo.tiempo_aux', 'U') IS NOT NULL DROP TABLE dbo.tiempo_aux;
CREATE TABLE dbo.tiempo_aux (  -- modelo: "TIEMPO AUX"
    [AÑO] BIGINT NULL,
    [MES] BIGINT NULL,
    [Periodo] DATE NULL,
    [Fecha ID] BIGINT NULL
);

IF OBJECT_ID('dbo.tipologia', 'U') IS NOT NULL DROP TABLE dbo.tipologia;
CREATE TABLE dbo.tipologia (  -- modelo: "Tipologia"
    [Mes Carga] BIGINT NULL,
    [Año Carga] BIGINT NULL,
    [Nombre activo-empresa] NVARCHAR(255) NULL,
    [Versión] NVARCHAR(255) NULL,
    [TIPOLOGIAS/MÉTRICA] NVARCHAR(255) NULL,
    [UNIDADES ADMINISTRADAS] FLOAT NULL,
    [Año información] BIGINT NULL,
    [Mes ] BIGINT NULL
);
