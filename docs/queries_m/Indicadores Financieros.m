let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\Renta Residencial .xlsx"), null, true),
    #"Indicadores Financieros _Sheet" = Origen{[Item="Indicadores Financieros ",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"Indicadores Financieros _Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Mes de carga", Int64.Type}, {"Año de carga", Int64.Type}, {"Nombre activo", type text}, {"Item", type text}, {"Periodo", type date}, {"mes", Int64.Type}, {"anio", Int64.Type}, {"Versión_Real", type number}, {"Versión_Ppto", type number}, {"Versión_Proyección", type number}, {"Indice", Int64.Type}, {"YTD REAL", type number}, {"YTD PPTO", type number}})
in
    #"Tipo cambiado"