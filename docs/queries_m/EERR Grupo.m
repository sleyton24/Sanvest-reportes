let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\Base balance.xlsx"), null, true),
    #"EERR Grupo_Sheet" = Origen{[Item="EERR Grupo",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"EERR Grupo_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"N1", type text}, {"N2", type text}, {"N3", type text}, {"Real", type number}, {"YTG", type number}, {"Forecast", type number}, {"Presupuesto", type number}, {"Notas", Int64.Type}, {"Trimestre", type text}, {"Comentario Nota", type any}, {"Indice", Int64.Type}, {"2024", type number}})
in
    #"Tipo cambiado"