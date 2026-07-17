let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\OneDrive - BNV\Formatos para reportes PBI\USA.xlsx"), null, true),
    #"USA DIF I y II ACUMULADOS_Sheet" = Origen{[Item="USA DIF I y II ACUMULADOS",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"USA DIF I y II ACUMULADOS_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Mes Carga", Int64.Type}, {"Año Carga", Int64.Type}, {"Nombre Fondo", type text}, {"Nombre Activo", type text}, {"Cuenta/Tabla", type text}, {"periodo acumulado", Int64.Type}, {"Trimestre Acumulado", type text}, {"Año", Int64.Type}, {"ACTUAL DISTRIBUTION (USD)", type number}, {"BUDGET YIELD (%)", type number}, {"ACTUAL YIELD (%)", type number}, {"Indice", Int64.Type}, {"Trimeste Real", type text}, {"Div. Yield Annualized Budget", type number}, {"Div. Yield Annualized", type number}})
in
    #"Tipo cambiado"