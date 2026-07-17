let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\Deuda.xlsx"), null, true),
    Deuda_Sheet = Origen{[Item="Deuda",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(Deuda_Sheet, [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Activo", type text}, {"Cuota ", type number}, {"por pagar", type number}, {"Fecha", type date}, {"Año", Int64.Type}, {"Mes", Int64.Type}, {"FechaId ", Int64.Type}})
in
    #"Tipo cambiado"