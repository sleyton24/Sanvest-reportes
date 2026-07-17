let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Finanzas\24. Sanvest BI\Sanvest BI\Formatos para reportes PBI\2. Bases Reportes USA\BD Gestion USA .xlsx"), null, true),
    #"Bemiston GP and LP Information_Sheet" = Origen{[Item="Bemiston GP and LP Information",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"Bemiston GP and LP Information_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Categ", type text}, {"Equity", type number}, {"Distributions", type number}, {"Net Cash Flow", type number}, {"EM", type number}, {"XIRR", type number}, {"Promote", type number}, {"Structure Fee", type number}, {"AM Fees", type number}})
in
    #"Tipo cambiado"