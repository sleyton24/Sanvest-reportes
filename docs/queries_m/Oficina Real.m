let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\OneDrive - BNV\Formatos para reportes PBI\Gestion Oficina.xlsx"), null, true),
    #"Oficina Real_Sheet" = Origen{[Item="Oficina Real",Kind="Sheet"]}[Data],
    #"Encabezados promovidos" = Table.PromoteHeaders(#"Oficina Real_Sheet", [PromoteAllScalars=true]),
    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos",{{"Nombre activo", type text}, {"Periodo", type date}, {"mes", Int64.Type}, {"Año", Int64.Type}, {"Ingresos totales UF", type number}, {"Costos operacionales UF", type number}, {"EBITDA UF", type number}, {"Flujo UF", type number}, {"Ocupación Oficinas (%)", type number}, {"Ocupación Locales comerciales (%)", type number}, {"Ocupación Estacionamientos (%)", type number}, {"Gasto Común prorrata Atempora (UF/m2)", type number}, {"Arriendo Oficinas (UF/m2)", type number}, {"Arriendo Locales comerciales (UF/m2)", type number}, {"M2 ARRENDADOS OFICINAS", type number}, {"M2 ARRENDADOS LOCALES COMERCIALES", type number}, {"NUEVOS CONTRATOS FIRMADOS", Int64.Type}, {"METROS CUADRADOS AGREGADOS DEL MES", type number}, {"tiempoid", Int64.Type}})
in
    #"Tipo cambiado"