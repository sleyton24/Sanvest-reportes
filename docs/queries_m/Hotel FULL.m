let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\BD HOTEL .xlsx"), null, true),
    #"Hotel FULL_Sheet" = Origen{[Item="Hotel FULL",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"Hotel FULL_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Periodo", type date}, {"Mes de carga", Int64.Type}, {"Año de carga", Int64.Type}, {"Nombre activo", type text}, {"Item", type text}, {"mes", Int64.Type}, {"anio", Int64.Type}, {"Versión_Real", type number}, {"Versión_Ppto", type number}, {"Versión_Proyección", type number}, {"Versión_Real YTD", type number}, {"Versión_Ppto YTD", type number}, {"indice", Int64.Type}, {"fechaID", Int64.Type}})
in
    #"Tipo cambiado"