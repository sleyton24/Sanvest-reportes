let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\OneDrive - BNV\Formatos para reportes PBI\BD HOTEL .xlsx"), null, true),
    #"Hotel Real_Sheet" = Origen{[Item="Hotel Real",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"Hotel Real_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Nombre activo", type text}, {"Periodo", type date}, {"mes", Int64.Type}, {"anio", Int64.Type}, {"Ingresos totales", type number}, {"Costos operacionales UF", type number}, {"EBITDA UF", type number}, {"Flujo (Resultado) UF", type number}, {"EBITDA/CUOTA BANCO", type number}, {"ADR Room (USD)", type number}, {"Ocupación pago 2024 (%)", type number}})
in
    #"Tipo cambiado"