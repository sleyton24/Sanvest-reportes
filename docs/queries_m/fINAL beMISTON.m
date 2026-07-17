let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\BD Gestion USA .xlsx"), null, true),
    #"fINAL beMISTON_Sheet" = Origen{[Item="fINAL beMISTON",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"fINAL beMISTON_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Nivel 1", type text}, {"Nivel 3", type text}, {"Fecha", type date}, {"Monto 2", type number}, {"Año", Int64.Type}, {"Mes", Int64.Type}, {"Fecha ID ", Int64.Type}, {"Real", Int64.Type}, {"YTD", Int64.Type}, {"YTD PPTO", type number}, {"Indice", Int64.Type}, {"Nivel 2", type text}, {"AUX YTD ", type number}, {"AUX YTD P", type number}, {"Monto AUX", type number}, {"Real UAX", type number}})
in
    #"Tipo cambiado"