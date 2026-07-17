let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\CIVITAS.xlsx"), null, true),
    Morosidad_Sheet = Origen{[Item="Morosidad",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(Morosidad_Sheet, [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"}", type text}, {"Clasif", type text}, {"SALDO PENDIENTE", type number}})
in
    #"Tipo cambiado"