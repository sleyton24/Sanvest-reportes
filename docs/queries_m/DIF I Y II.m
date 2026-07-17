let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\OneDrive - BNV\Formatos para reportes PBI\USA.xlsx"), null, true),
    #"DIF I Y II_Sheet" = Origen{[Item="DIF I Y II",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"DIF I Y II_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Mes Carga", Int64.Type}, {"Año Carga", Int64.Type}, {"Nombre fondo/Activo", type text}, {"Nombre del activo", type text}, {"periodo_acumulado", Int64.Type}, {"Trimestre", type text}, {"Año", Int64.Type}, {"Invested Capital_ACTUAL", type number}, {"Distributions_BUDGET", type number}, {"Annual Return BUDGET", type number}})
in
    #"Tipo cambiado"