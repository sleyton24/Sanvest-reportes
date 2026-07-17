let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\OneDrive - BNV\Formatos para reportes PBI\Desarrollo para la venta.xlsx"), null, true),
    #"DV Indicadores Financieros _Sheet" = Origen{[Item="DV Indicadores Financieros ",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"DV Indicadores Financieros _Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Mes", Int64.Type}, {"Año", Int64.Type}, {"Tipo de datos", type text}, {"Nombre proyecto", type text}, {"Versión", type text}, {"Margen_%_(UT/CT)", type number}, {"Margen_%_(UT/VT)", type number}, {"Margen_proyecto_UF", type number}, {"Inversion_total_BNV_(UF)", type number}, {"Participacion_BNV_en_sociedad (%)", type number}, {"Margen_BNV_AI_(UF)", type number}, {"ROI_BNV_AI", type number}, {"TIR_BNV_AI", type number}, {"Periodo", type date}})
in
    #"Tipo cambiado"