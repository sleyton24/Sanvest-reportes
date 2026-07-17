let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\OneDrive - BNV\Formatos para reportes PBI\Gestion Oficina.xlsx"), null, true),
    #"Oficina Original_Sheet" = Origen{[Item="Oficina Original",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"Oficina Original_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Mes de carga", Int64.Type}, {"Año de carga", Int64.Type}, {"Nombre activo", type text}, {"Item", type text}, {"Periodo", type date}, {"mes", Int64.Type}, {"anio", Int64.Type}, {"Versión_Real", type number}, {"Versión_Ppto", type number}})
in
    #"Tipo cambiado"