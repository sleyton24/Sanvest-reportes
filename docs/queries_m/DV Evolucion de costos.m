let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\Desarrollo para la venta.xlsx"), null, true),
    #"DV Evolucion de costos _Sheet" = Origen{[Item="DV Evolucion de costos ",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"DV Evolucion de costos _Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Mes de carga", Int64.Type}, {"Año de carga", Int64.Type}, {"Tipo de datos", type text}, {"Nombre proyecto", type text}, {"Año", Int64.Type}, {"mes", Int64.Type}, {"Periodo", type date}, {"PPTO_DE_COSTOS", type number}, {"PROYECCIÓN_DE_COSTOS", type number}, {"COSTOS_REALES", type number}, {"Fecha Id", Int64.Type}})
in
    #"Tipo cambiado"