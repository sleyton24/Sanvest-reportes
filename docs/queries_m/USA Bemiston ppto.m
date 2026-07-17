let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\BNV\Administración y Finanzas - Documentos\Finanzas\24. Sanvest BI\Sanvest BI\Formatos para reportes PBI\2. Bases Reportes USA\BD Gestion USA .xlsx"), null, true),
    #"USA Bemiston ppto_Sheet" = Origen{[Item="USA Bemiston ppto",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"USA Bemiston ppto_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Nivel 2 ", type text}, {"Nivel 1", type text}, {"Nivel 3", type text}, {"Fecha", type date}, {"Monto 2", type number}, {"Año", Int64.Type}, {"Mes", Int64.Type}, {"Fecha ID ", Int64.Type}, {"Real", Int64.Type}, {"YTD", Int64.Type}, {"YTD PPTO", type number}})
in
    #"Tipo cambiado"