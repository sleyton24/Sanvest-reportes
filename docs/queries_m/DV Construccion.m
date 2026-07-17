let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\Desarrollo para la venta.xlsx"), null, true),
    #"DV Construccion_Sheet" = Origen{[Item="DV Construccion",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"DV Construccion_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Mes de carga ", Int64.Type}, {"Año de carga", Int64.Type}, {"Tipo de datos", type text}, {"Nombre proyecto", type text}, {"Versión", type text}, {"AVANCE_CONSTRUCCIÓN", type number}, {"INCIDENCIA_CONSTRUCCIÓN_(UF/M2 LOSA)", type number}, {"COSTOS_TOTALES_PROYECTO_NETO (UF)", type number}, {"COSTO_TOTAL/M2_VENDIBLE_(UF/M2)", type number}, {"COSTO_TOTAL_PROYECTO_(UF)", type number}, {"%LINEA/COSTO_TOTAL_NETO", type number}, {"DEUDA_A_LA_FECHA UF", type number}, {"Periodo", type date}, {"Fecha ID ", Int64.Type}})
in
    #"Tipo cambiado"