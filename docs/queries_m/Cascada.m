let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\Base balance.xlsx"), null, true),
    Cascada_Sheet = Origen{[Item="Cascada",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(Cascada_Sheet, [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"N1", type text}, {"Monto ", type number}, {"N2", type text}, {"Fecha Trimestre", type text}})
in
    #"Tipo cambiado"