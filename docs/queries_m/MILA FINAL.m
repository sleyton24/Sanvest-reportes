let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\BD Gestion USA .xlsx"), null, true),
    #"MILA FINAL_Sheet" = Origen{[Item="MILA FINAL",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"MILA FINAL_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Nivel 2 ", type text}, {"Nivel 1", type text}, {"Nivel 3", type text}, {"Fecha", type date}, {"Monto 2", Int64.Type}, {"Año", Int64.Type}, {"Mes", Int64.Type}, {"Fecha ID ", Int64.Type}, {"Real", Int64.Type}, {"YTD", Int64.Type}, {"YTD PPTO", Int64.Type}, {"Indice", type number}, {"AUX", Int64.Type}, {"AUX2", Int64.Type}, {"AUXYTD", Int64.Type}, {"AUXYTD2", Int64.Type}})
in
    #"Tipo cambiado"