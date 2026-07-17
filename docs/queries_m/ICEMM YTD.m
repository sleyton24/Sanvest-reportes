let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\ICEMM.xlsx"), null, true),
    #"ICEMM YTD_Sheet" = Origen{[Item="ICEMM YTD",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"ICEMM YTD_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Nivel 1", type text}, {"Nivel 2", type text}, {"Real", Int64.Type}, {"PPTO", Int64.Type}, {"YTG Proy", type number}, {"YTG PPTO", type number}, {"Fecha", type date}})
in
    #"Tipo cambiado"