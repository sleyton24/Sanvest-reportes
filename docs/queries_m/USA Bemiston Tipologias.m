let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\BNV\Administración y Finanzas - Documentos\Finanzas\24. Sanvest BI\Sanvest BI\Formatos para reportes PBI\2. Bases Reportes USA\BD Gestion USA .xlsx"), null, true),
    #"USA Bemiston Tipologias _Sheet" = Origen{[Item="USA Bemiston Tipologias ",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"USA Bemiston Tipologias _Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Floor Plan", type text}, {"Unit Count", Int64.Type}, {"Avg SF/Unit", type number}, {"Avg Rent/Unit", type number}, {"Avg Rent PSF", type number}})
in
    #"Tipo cambiado"