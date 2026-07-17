let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\OneDrive - BNV\Formatos para reportes PBI\USA.xlsx"), null, true),
    KPI_Sheet = Origen{[Item="KPI",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(KPI_Sheet, [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Nombre Fondo", type text}, {"Div. Yield Annualized", type number}, {"Trimestre Acumulado", type text}, {"Año ", Int64.Type}})
in
    #"Tipo cambiado"