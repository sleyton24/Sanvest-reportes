let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\BD Gestion USA .xlsx"), null, true),
    #"St grand final_Sheet" = Origen{[Item="St grand final",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"St grand final_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Nivel 1", type text}, {"Nivel 3", type text}, {"Nivel 2", type text}, {"Monto AUX", type number}, {"Monto 2", type number}, {"Año", Int64.Type}, {"Mes", Int64.Type}, {"Fecha ID ", Int64.Type}, {"Real UAX", type number}, {"Real", type number}, {"YTD", type number}, {"YTD PPTO", type number}, {"Indice", type any}, {"Fecha", type date}, {"AUX YTD ", type any}, {"AUX YTD P", type number}}),
    #"Filas filtradas" = Table.SelectRows(#"Tipo cambiado", each true),
    #"Tipo cambiado1" = Table.TransformColumnTypes(#"Filas filtradas",{{"Indice", type number}, {"AUX YTD ", type number}, {"PPTO graficos", type number}, {"Real Graficos", type number}, {"YTD Graf", type number}, {"YTD graf PPTO", type number}})
in
    #"Tipo cambiado1"