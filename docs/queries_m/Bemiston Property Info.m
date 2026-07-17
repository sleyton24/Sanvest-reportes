let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\BNV\Administración y Finanzas - Documentos\Finanzas\24. Sanvest BI\Sanvest BI\Formatos para reportes PBI\2. Bases Reportes USA\BD Gestion USA .xlsx"), null, true),
    #"Bemiston Property Info_Sheet" = Origen{[Item="Bemiston Property Info",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"Bemiston Property Info_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Property Information", type text}, {"Total Land Size (Feet)", type number}, {"Gross Square Feet (GSF)", Int64.Type}, {"Number of Units", Int64.Type}, {"Parking", Int64.Type}, {"Rentable Square Feet (RSF)", Int64.Type}})
in
    #"Tipo cambiado"