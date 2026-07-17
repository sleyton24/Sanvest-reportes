let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\Renta Residencial .xlsx"), null, true),
    Tipologia_Sheet = Origen{[Item="Tipologia",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(Tipologia_Sheet, [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Mes Carga", Int64.Type}, {"Año Carga", Int64.Type}, {"Nombre activo-empresa", type text}, {"Versión", type text}, {"TIPOLOGIAS/MÉTRICA", type text}, {"UNIDADES ADMINISTRADAS", type number}, {"Año información", Int64.Type}, {"Mes ", Int64.Type}})
in
    #"Tipo cambiado"