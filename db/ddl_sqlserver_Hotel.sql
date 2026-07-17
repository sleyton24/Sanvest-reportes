-- DDL tablas planas — unidad Hotel — SQL Server (producción VPS)
-- Generado de la réplica del ETL. Tipos: del M (TransformColumnTypes)
-- cuando existen; inferidos del dato en columnas no casteadas.
-- Ejecutar en la base destino. Dev usa SQLite vía SQLAlchemy (to_sql).

IF OBJECT_ID('dbo.hotel_full', 'U') IS NOT NULL DROP TABLE dbo.hotel_full;
CREATE TABLE dbo.hotel_full (  -- modelo: "Hotel FULL"
    [Periodo] DATE NULL,
    [Mes de carga] BIGINT NULL,
    [Año de carga] BIGINT NULL,
    [Nombre activo] NVARCHAR(255) NULL,
    [Item] NVARCHAR(255) NULL,
    [mes] BIGINT NULL,
    [anio] BIGINT NULL,
    [Versión_Real] FLOAT NULL,
    [Versión_Ppto] FLOAT NULL,
    [Versión_Proyección] FLOAT NULL,
    [Versión_Real YTD] FLOAT NULL,
    [Versión_Ppto YTD] FLOAT NULL,
    [indice] BIGINT NULL,
    [fechaID] BIGINT NULL
);

IF OBJECT_ID('dbo.hotel_graficos', 'U') IS NOT NULL DROP TABLE dbo.hotel_graficos;
CREATE TABLE dbo.hotel_graficos (  -- modelo: "Hotel Graficos"
    [Nombre activo] NVARCHAR(255) NULL,
    [Periodo] DATE NULL,
    [mes] BIGINT NULL,
    [anio] BIGINT NULL,
    [FechaID] BIGINT NULL,
    [Ingresos totales] FLOAT NULL,
    [Costos operacionales UF] FLOAT NULL,
    [EBITDA UF] FLOAT NULL,
    [Flujo (Resultado) UF] FLOAT NULL,
    [EBITDA/CUOTA BANCO] FLOAT NULL,
    [ADR Room (USD)] FLOAT NULL,
    [Ocupación pago 2024 (%)] FLOAT NULL,
    [REVPAR USD] FLOAT NULL,
    [ADR Room (CLP)] FLOAT NULL,
    [REVPAR (CLP)] FLOAT NULL,
    [ADR Room (CLP) YTD] FLOAT NULL,
    [REVPAR (CLP) YTD] FLOAT NULL,
    [ADR Room (USD) YTD] FLOAT NULL,
    [REVPAR (USD) YTD] FLOAT NULL,
    [LY AUX] BIGINT NULL,
    [Periodo LY AUX] DATETIME2 NULL,
    [Ingresos totales LY] FLOAT NULL,
    [Costos operacionales LY] FLOAT NULL,
    [EBITDA UF LY] FLOAT NULL,
    [Flujo (Resultado) UF LY] FLOAT NULL,
    [EBITDA/CUOTA BANCO LY] FLOAT NULL,
    [ADR Room (USD) LY] FLOAT NULL,
    [Ocupación pago 2024 (%) LY] FLOAT NULL,
    [REVPAR USD LY] FLOAT NULL
);

IF OBJECT_ID('dbo.hotel_original', 'U') IS NOT NULL DROP TABLE dbo.hotel_original;
CREATE TABLE dbo.hotel_original (  -- modelo: "Hotel Original"
    [Column1] NVARCHAR(255) NULL,
    [Column2] NVARCHAR(255) NULL,
    [Column3] NVARCHAR(255) NULL,
    [Column4] NVARCHAR(255) NULL,
    [Column5] NVARCHAR(255) NULL,
    [Column6] NVARCHAR(255) NULL,
    [Column7] NVARCHAR(255) NULL,
    [Column8] NVARCHAR(255) NULL,
    [Column9] NVARCHAR(255) NULL,
    [Column10] NVARCHAR(255) NULL
);

IF OBJECT_ID('dbo.hotel_ppto', 'U') IS NOT NULL DROP TABLE dbo.hotel_ppto;
CREATE TABLE dbo.hotel_ppto (  -- modelo: "Hotel PPTO"
    [Nombre activo] NVARCHAR(255) NULL,
    [Periodo] DATE NULL,
    [mes] BIGINT NULL,
    [anio] BIGINT NULL,
    [FechaID] BIGINT NULL,
    [Ingresos totales] FLOAT NULL,
    [Costos operacionales UF] FLOAT NULL,
    [EBITDA UF] FLOAT NULL,
    [Flujo (Resultado) UF] FLOAT NULL,
    [EBITDA/CUOTA BANCO] FLOAT NULL,
    [ADR Room (USD)] FLOAT NULL,
    [Ocupación pago 2024 (%)] FLOAT NULL,
    [REVPAR USD] FLOAT NULL,
    [ADR Room (CLP)] FLOAT NULL,
    [REVPAR (CLP)] FLOAT NULL,
    [ADR Room (CLP) YTD] FLOAT NULL,
    [REVPAR (CLP) YTD] FLOAT NULL,
    [ADR Room (USD) YTD] FLOAT NULL,
    [REVPAR (USD) YTD] FLOAT NULL,
    [LY AUX] BIGINT NULL,
    [Periodo LY AUX] DATE NULL,
    [Ingresos totales LY] FLOAT NULL,
    [Costos operacionales LY] FLOAT NULL,
    [EBITDA UF LY] FLOAT NULL,
    [Flujo (Resultado) UF LY] FLOAT NULL,
    [EBITDA/CUOTA BANCO LY] FLOAT NULL,
    [ADR Room (USD) LY] FLOAT NULL,
    [Ocupación pago 2024 (%) LY] FLOAT NULL,
    [REVPAR USD LY] FLOAT NULL
);

IF OBJECT_ID('dbo.hotel_real', 'U') IS NOT NULL DROP TABLE dbo.hotel_real;
CREATE TABLE dbo.hotel_real (  -- modelo: "Hotel Real"
    [Nombre activo] NVARCHAR(255) NULL,
    [Periodo] DATE NULL,
    [mes] BIGINT NULL,
    [anio] BIGINT NULL,
    [FechaID] BIGINT NULL,
    [Ingresos totales] FLOAT NULL,
    [Costos operacionales UF] FLOAT NULL,
    [EBITDA UF] FLOAT NULL,
    [Flujo (Resultado) UF] FLOAT NULL,
    [EBITDA/CUOTA BANCO] FLOAT NULL,
    [ADR Room (USD)] FLOAT NULL,
    [Ocupación pago 2024 (%)] FLOAT NULL,
    [REVPAR USD] FLOAT NULL,
    [ADR Room (CLP)] FLOAT NULL,
    [REVPAR (CLP)] FLOAT NULL,
    [ADR Room (CLP) YTD] FLOAT NULL,
    [REVPAR (CLP) YTD] FLOAT NULL,
    [ADR Room (USD) YTD] FLOAT NULL,
    [REVPAR (USD) YTD] FLOAT NULL,
    [LY AUX] BIGINT NULL,
    [Periodo LY AUX] BIGINT NULL,
    [Ingresos totales LY] FLOAT NULL,
    [Costos operacionales LY] FLOAT NULL,
    [EBITDA UF LY] FLOAT NULL,
    [Flujo (Resultado) UF LY] FLOAT NULL,
    [EBITDA/CUOTA BANCO LY] FLOAT NULL,
    [ADR Room (USD) LY] FLOAT NULL,
    [Ocupación pago 2024 (%) LY] FLOAT NULL,
    [REVPAR USD LY] FLOAT NULL
);
