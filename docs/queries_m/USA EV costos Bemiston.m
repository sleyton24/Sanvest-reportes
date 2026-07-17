let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\OneDrive - BNV\Formatos para reportes PBI\USA.xlsx"), null, true),
    #"USA EV costos Bemiston_Sheet" = Origen{[Item="USA EV costos Bemiston",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"USA EV costos Bemiston_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Mes de carga", Int64.Type}, {"Año de carga", Int64.Type}, {"Año", Int64.Type}, {"Periodo", type date}, {"Mes", Int64.Type}, {"Nombre activo", type text}, {"Versión", type text}, {"COSTO_TOTAL_PROYECTO_(USD)", type number}})
in
    #"Tipo cambiado"