let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\Base balance.xlsx"), null, true),
    Balance_Sheet = Origen{[Item="Balance",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(Balance_Sheet, [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"N1 ", type text}, {"N2", type text}, {"N3", type text}, {"N4", type text}, {"N5", type text}, {"Costo UF LQ", type number}, {"Costo USD LQ", type number}, {"Mercado UF LQ", type number}, {"Mercado USD LQ", type number}, {"Costo UF QAC", type number}, {"Costo USD QAC", type number}, {"Mercado UF QAC", type number}, {"Mercado USD QAC", type number}, {"Trimestre", type text}, {"Notas", Int64.Type}, {"Indice", type number}, {"Indice 2 ", Int64.Type}})
in
    #"Tipo cambiado"