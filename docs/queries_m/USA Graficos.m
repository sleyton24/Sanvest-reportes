let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\BD Gestion USA .xlsx"), null, true),
    #"USA Graficos_Sheet" = Origen{[Item="USA Graficos",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"USA Graficos_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Fecha", type date}, {"Item", type text}, {"Actual", type number}, {"Budget", type number}, {"Original", type number}, {"Original N", type number}, {"Actual P", type number}, {"Budget P", type number}, {"Actual YTD", type number}, {"Budget YTD", type number}, {"Original YTD", type number}, {"Activo", type text}, {"mes ", Int64.Type}, {"año", Int64.Type}, {"FechaID", Int64.Type}, {"OR YTD P", type number}, {"AUX Real", type number}, {"Aux BD ", type number}}),
    #"Filas filtradas" = Table.SelectRows(#"Tipo cambiado", each true)
in
    #"Filas filtradas"