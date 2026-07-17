let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\Renta Residencial .xlsx"), null, true),
    #"TIEMPO AUX_Sheet" = Origen{[Item="TIEMPO AUX",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"TIEMPO AUX_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"AÑO", Int64.Type}, {"MES", Int64.Type}, {"Periodo", type date}, {"Fecha ID", Int64.Type}})
in
    #"Tipo cambiado"