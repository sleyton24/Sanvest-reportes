let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\Renta Residencial .xlsx"), null, true),
    #"Indicadores Financieros Lar_Sheet" = Origen{[Item="Indicadores Financieros Lar",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"Indicadores Financieros Lar_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Nombre activo", type text}, {"Nivel 1 ", type text}, {"Nivel 2", type text}, {"Periodo", type date}, {"Mes", Int64.Type}, {"Año", Int64.Type}, {"Real Peso", type number}, {"PPTO Peso", type number}, {"Versión_Real", type number}, {"Versión_Ppto", type number}, {"YTD REAL", type number}, {"YTD PPTO", type number}, {"UF Mes", type number}, {"UF Mes PPTO", type number}, {"Indice", Int64.Type}, {"FechaID", Int64.Type}})
in
    #"Tipo cambiado"