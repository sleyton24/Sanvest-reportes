let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\Desarrollo para la venta.xlsx"), null, true),
    #"DV Uso y Fondo _Sheet" = Origen{[Item="DV Uso y Fondo ",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"DV Uso y Fondo _Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Mes de carga", Int64.Type}, {"Año de carga", Int64.Type}, {"Tipo de datos", type text}, {"Nombre proyecto", type text}, {"Categoria", type text}, {"SUBCATEGORIA", type text}, {"Monto", type number}, {"Fecha", type date}, {"Fecha ID", Int64.Type}})
in
    #"Tipo cambiado"