let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\ICEMM.xlsx"), null, true),
    Flujo_Sheet = Origen{[Item="Flujo",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(Flujo_Sheet, [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Orden", Int64.Type}, {"Categoría 1", type text}, {"Categoría 2", type text}, {"Fecha", type date}, {"Monto", type number}})
in
    #"Tipo cambiado"