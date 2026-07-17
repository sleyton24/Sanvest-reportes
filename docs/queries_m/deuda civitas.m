let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\CIVITAS.xlsx"), null, true),
    #"deuda civitas_Sheet" = Origen{[Item="deuda civitas",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"deuda civitas_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Proyecto", type text}, {"Amortización", type number}, {"Capital", type number}, {"Año", Int64.Type}, {"mes", Int64.Type}, {"Fecha", type date}, {"FechaID", Int64.Type}})
in
    #"Tipo cambiado"