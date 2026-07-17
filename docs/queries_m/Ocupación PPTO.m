let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\BD Gestion USA .xlsx"), null, true),
    #"Ocupación PPTO_Sheet" = Origen{[Item="Ocupación PPTO",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"Ocupación PPTO_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Occupied %", type number}, {"Fecha", type date}, {"Fecha ID", Int64.Type}, {"Activo ", type text}, {"Occupied % R", type number}, {"Ocupacion O", type number}, {"Ocupacion Retail", type number}, {"Ocupacion Retail BD", type number}})
in
    #"Tipo cambiado"