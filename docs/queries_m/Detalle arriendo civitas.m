let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\BNV\Administración y Finanzas - Documentos\Finanzas\24. Sanvest BI\Sanvest BI\Formatos para reportes PBI\CIVITAS.xlsx"), null, true),
    #"Detalle arriendo civitas_Sheet" = Origen{[Item="Detalle arriendo civitas",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"Detalle arriendo civitas_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Unidad", type text}, {"Superficie prorrateo [m²]", type number}, {"Superficie [m²]", type number}, {"Tipología", type text}, {"UF/mes", type number}, {"Precio lista [UF/m²]", type number}, {"Precio [UF]", type number}, {"Estado", type text}, {"Usuario", type any}, {"Valor arriendo [UF]", type number}, {"Valor arriendo [UF/m²]", type number}, {"Fecha inicio", type date}, {"Plazo", Int64.Type}, {"Renovación", Int64.Type}, {"Fecha término", type date}, {"m2 aux", type number}})
in
    #"Tipo cambiado"