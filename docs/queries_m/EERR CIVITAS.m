let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\CIVITAS.xlsx"), null, true),
    #"EERR CIVITAS_Sheet" = Origen{[Item="EERR CIVITAS",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"EERR CIVITAS_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Nivel 2 ", type text}, {"Nivel 1 ", type text}, {"Monto", type number}, {"Fecha ", type date}, {"año ", Int64.Type}, {"mes ", Int64.Type}, {"fechaID", Int64.Type}, {"Indice ", Int64.Type}}),
    #"Columnas con nombre cambiado" = Table.RenameColumns(#"Tipo cambiado",{{"Nivel 2 ", "Nivel 2"}}),
    #"Tipo cambiado1" = Table.TransformColumnTypes(#"Columnas con nombre cambiado",{{"ppto", type number}, {"YTD Real", Int64.Type}, {"YTD PPTO", Int64.Type}})
in
    #"Tipo cambiado1"