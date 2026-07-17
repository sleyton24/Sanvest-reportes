let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\BNV\Administración y Finanzas - Documentos\Finanzas\24. Sanvest BI\Sanvest BI\Formatos para reportes PBI\2. Bases Reportes USA\BD Gestion USA .xlsx"), null, true),
    #"Uso Y fondo Bemiston_Sheet" = Origen{[Item="Uso Y fondo Bemiston",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"Uso Y fondo Bemiston_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Category", type text}, {"Tipo ", type text}, {"Monto", type number}, {"Activo", type text}, {"Column5", type any}}),
    #"Columnas quitadas" = Table.RemoveColumns(#"Tipo cambiado",{"Column5"})
in
    #"Columnas quitadas"