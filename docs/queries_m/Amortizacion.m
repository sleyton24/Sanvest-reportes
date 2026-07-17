let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\Desarrollo para la venta.xlsx"), null, true),
    Amortizacion_Sheet = Origen{[Item="Amortizacion",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(Amortizacion_Sheet, [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Proyecto", type text}, {"Amortizado", type number}, {"Saldo", type number}, {"Fecha", type date}, {"FechaID", Int64.Type}})
in
    #"Tipo cambiado"