let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\OneDrive - BNV\Formatos para reportes PBI\USA.xlsx"), null, true),
    #"DIF II_Sheet" = Origen{[Item="DIF II",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"DIF II_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Mes Carga", Int64.Type}, {"Año Carga", Int64.Type}, {"Nombre Fondo", type text}, {"Nombre Activo", type text}, {"Cuenta/Tabla", type text}, {"periodo acumulado", Int64.Type}, {"Trimestre Acumulado", type text}, {"Año", Int64.Type}, {"ACTUAL DISTRIBUTION (USD)", type number}, {"BUDGET YIELD (%)", type number}, {"ACTUAL YIELD (%)", type number}, {"DIF I Div. Yield (Annualized)", type number}})
in
    #"Tipo cambiado"