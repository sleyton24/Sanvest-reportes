let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\Desarrollo para la venta.xlsx"), null, true),
    #"DV KPIS_Sheet" = Origen{[Item="DV KPIS",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"DV KPIS_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Mes", Int64.Type}, {"Año", Int64.Type}, {"Tipo de datos", type text}, {"Nombre proyecto", type text}, {"Versión", type text}, {"VENTAS NETAS_DEL_MES", type number}, {"UNIDADES_VENDIDAS", type number}, {"AVANCE_VENTAS_(UNIDADES)%", type number}, {"UF/M2_VENTA", type number}, {"UNIDADES TOTALES", Int64.Type}, {"Periodo", type date}})
in
    #"Tipo cambiado"