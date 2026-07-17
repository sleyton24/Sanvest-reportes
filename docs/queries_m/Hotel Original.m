let
    Origen = Excel.Workbook(File.Contents("C:\One Drive Sleyton\OneDrive - BNV\Formatos para reportes PBI\BD HOTEL .xlsx"), null, true),
    #"Hotel Original _Sheet" = Origen{[Item="Hotel Original ",Kind="Sheet"]}[Data]
in
    #"Hotel Original _Sheet"