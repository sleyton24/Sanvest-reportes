let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\Desarrollo para la venta.xlsx"), null, true),
    #"DV Ventas_Sheet" = Origen{[Item="DV Ventas",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"DV Ventas_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Mes de carga", Int64.Type}, {"Año de carga", Int64.Type}, {"Tipo de datos", type text}, {"Nombre proyecto", type text}, {"Versión", type text}, {"VENTAS_ACUMULADAS", type number}, {"UF_RECAUDADAS         ", type number}, {"UF_POR_RECAUDAR", type number}, {"PROYECCIÓN_VENTA_TOTAL(UF)", type number}, {"UNIDADES_ESCRITURADAS_RECAUDADAS", Int64.Type}, {"UNIDADES_ESCRITURADAS_FIRMADAS", Int64.Type}, {"RESERVAS_Y_PROMESAS", type number}, {"Año Mes ", type date}})
in
    #"Tipo cambiado"