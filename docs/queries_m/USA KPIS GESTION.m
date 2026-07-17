let
    Origen = Excel.Workbook(File.Contents("C:\Users\sleyton\BNV\Administración y Finanzas - Documentos\Inteligencia de negocios\Formatos para reportes PBI\BD Gestion USA .xlsx"), null, true),
    #"USA KPIS GESTION_Sheet" = Origen{[Item="USA KPIS GESTION",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"USA KPIS GESTION_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Dólar SQF AC MONTH", type number}, {"Dólar SQF BD MONTH", type number}, {"Dólar SQF Retail AC MONTH", type number}, {"Dólar SQF Retail BD MONTH", type number}, {"Dólar SQF AC YTD", type any}, {"Dólar SQF BD YTD", type number}, {"Dólar SQF Retail AC YTD", type number}, {"Dólar SQF Retail BD YTD", type number}, {"AVG RENT ", Int64.Type}, {"DATE AC", type date}, {"AVG RENT BD", type number}, {"Activo", type text}, {"AVG Rent O", type number}, {"Dólar SQF O", type number}, {"Dólar SQF O AVG", type number}}),
    #"Errores quitados" = Table.RemoveRowsWithErrors(#"Tipo cambiado", {"Dólar SQF O AVG"})
in
    #"Errores quitados"