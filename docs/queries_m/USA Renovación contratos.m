let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\BNV\Administración y Finanzas - Documentos\Finanzas\24. Sanvest BI\Sanvest BI\Formatos para reportes PBI\2. Bases Reportes USA\BD Gestion USA .xlsx"), null, true),
    #"USA Renovación contratos_Sheet" = Origen{[Item="USA Renovación contratos",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"USA Renovación contratos_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Unit #", Int64.Type}, {"Lease Start", type date}, {"Lease End", type date}, {"Lease Term", Int64.Type}, {"Gross Rent", Int64.Type}, {"Gross Rent PSF", type number}, {"Full Term Gross Rent", Int64.Type}, {"Net Rent", type number}, {"Net PSF", type number}, {"Concession Amount ($)", type number}, {"Concession (%)", type number}, {"Concession (mths)", type number}, {"Utility Bundle", Int64.Type}, {"Parking", Int64.Type}, {"Renewal Offer Gross Rent", Int64.Type}, {" Market Rent", Int64.Type}, {"Renewal vs. Market Rent ($)", Int64.Type}, {"Renewal vs last", Int64.Type}, {"Net Rent PSF renewal", type number}, {"Market Rent PSF", type number}})
in
    #"Tipo cambiado"