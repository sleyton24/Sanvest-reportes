let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Finanzas\24. Sanvest BI\Sanvest BI\Formatos para reportes PBI\CIVITAS.xlsx"), null, true),
    #"Ventas Civitas_Sheet" = Origen{[Item="Ventas Civitas",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"Ventas Civitas_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Comprador", type text}, {"Oficinas", type any}, {"Venta Neta", type number}})
in
    #"Tipo cambiado"