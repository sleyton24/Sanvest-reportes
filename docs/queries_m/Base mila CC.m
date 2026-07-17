let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\BNV\Administración y Finanzas - Documentos\Finanzas\24. Sanvest BI\Sanvest BI\Formatos para reportes PBI\2. Bases Reportes USA\Uso Y fondos mila diciembre .xlsx"), null, true),
    #"Base mila CC_Sheet" = Origen{[Item="Base mila CC",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"Base mila CC_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Nivel 2", type text}, {"Nivel 1", type text}, {"Nivel 3 ", type text}, {"AUX", Int64.Type}, {"E", type number}, {"F", type number}, {"YTD ", type number}, {"AVANCE", type number}, {"YTG", type number}, {"REAL", type number}, {"Total Budget", type number}}),
    #"Filas filtradas" = Table.SelectRows(#"Tipo cambiado", each true)
in
    #"Filas filtradas"