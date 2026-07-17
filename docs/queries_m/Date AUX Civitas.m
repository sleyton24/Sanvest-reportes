let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\BNV\Administración y Finanzas - Documentos\Finanzas\24. Sanvest BI\Sanvest BI\Formatos para reportes PBI\CIVITAS.xlsx"), null, true),
    #"Date AUX Civitas_Sheet" = Origen{[Item="Date AUX Civitas",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"Date AUX Civitas_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Año", Int64.Type}, {"mes ", Int64.Type}, {"fecha ", type date}, {"fechaid", Int64.Type}})
in
    #"Tipo cambiado"