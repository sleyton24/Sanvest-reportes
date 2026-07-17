let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Finanzas\24. Sanvest BI\Sanvest BI\Formatos para reportes PBI\2. Bases Reportes USA\BD Gestion USA .xlsx"), null, true),
    #"USA Modelo Original Bemiston_Sheet" = Origen{[Item="USA Modelo Original Bemiston",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"USA Modelo Original Bemiston_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Loan", Int64.Type}, {"Loan Rate ", type number}, {"Calc LTV", type number}, {"Valuation", type number}, {"TIR GP ", type number}, {"TIR LP ", type number}, {"Yield to cost", type number}, {"Cap Rate ", type number}, {"Gross Value", type number}, {"Terminal NOI", type number}, {"Cash on Cash", type number}, {"Rent growth", type number}, {"Loan rate AC", type number}, {"Maturity", type date}})
in
    #"Tipo cambiado"