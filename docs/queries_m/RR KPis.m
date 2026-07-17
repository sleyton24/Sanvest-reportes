let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\OneDrive - BNV\Formatos para reportes PBI\Renta Residencial .xlsx"), null, true),
    #"RR KPis_Sheet" = Origen{[Item="RR KPis",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"RR KPis_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"mes carga", Int64.Type}, {"anio carga", Int64.Type}, {"Nombre activo", type text}, {"Versión", type text}, {"CONTRATOS POR VENCER ESTE MES", type any}, {"UNIDADES ARRENDADAS", Int64.Type}, {"OCUPACIÓN DEPTOS", type number}, {"OCUPACIÓN DEPARTAMENTOS_YTD", type number}, {"UF/M2_DEPARTAMENTOS", type number}, {"UF/M2_YTD", type number}, {"UF/ESTACIONAMIENTO", type number}, {"UF/ESTACIONAMIENTO_YTD", type number}, {"UF/M2 (DEPTO+ESTAC.)", type number}, {"UF/M2 (DEPTO+ESTAC.)_YTD", type number}, {"Periodo", type date}})
in
    #"Tipo cambiado"