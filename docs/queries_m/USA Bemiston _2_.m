let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\OneDrive - BNV\Formatos para reportes PBI\USA.xlsx"), null, true),
    #"USA Bemiston_Sheet" = Origen{[Item="USA Bemiston",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"USA Bemiston_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Mes de carga", Int64.Type}, {"Año de carga", Int64.Type}, {"Año", Int64.Type}, {"Periodo", type date}, {"Mes", Int64.Type}, {"Nombre activo", type text}, {"Versión", type text}, {"Inversión Total_USD", Int64.Type}, {"Participación_BNV_en_Sociedad(%)", type number}, {"TIR_BNV_AI", type number}, {"AVANCE_CONSTRUCCIÓN", type number}, {"COSTOS_TOTALES_PROYECTO_NETO (USD)", type number}, {"INCIDENCIA_CONSTRUCCIÓN_(USD/M2 LOSA)", type number}, {"COSTO_TOTAL_PROYECTO_(USD)", type number}, {"%LINEA/COSTO_TOTAL_NETO", type number}, {"DEUDA_A_LA_FECHA UF", type number}, {"DEUDA_APROBADA_(USD)", Int64.Type}})
in
    #"Tipo cambiado"