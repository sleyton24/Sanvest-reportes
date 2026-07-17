let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\Desarrollo para la venta.xlsx"), null, true),
    #"Financieros Sanvest_Sheet" = Origen{[Item="Financieros Sanvest",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"Financieros Sanvest_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Activo", type text}, {"Inversión Sanvest", type number}, {"Participación Sanvest", type number}, {"Margen % (UT/CT)", type number}, {"Margen % (UT/VTA)", type number}, {"Margen Sanvest UF", type number}, {"TIR Sanvest", type number}, {"ROI Sanvest", type number}, {"Margen Proyecto UF", type number}, {"UF/m2 Venta Dpto Ev. Original", type number}, {"UF/m2 venta total EV. Original", type number}, {"UF/m2 Venta Dpto actual", type number}, {"UF/m2 venta total actual", type number}, {"Incidencia construcción (UF/m2 losa)", type number}, {"Costo total neto /m2 vendible (UF/m2)", type number}})
in
    #"Tipo cambiado"