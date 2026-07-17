let
    Origen = Sql.Database("BNVSOFSQL\SQL_2", "SQLLAR", [Query="SELECT TOP (1000) [nombre]#(lf)      ,[dptos_Contrato]#(lf)      ,[Ndeptos]#(lf)      ,[ufm2r]#(lf)#(lf)  FROM [SQLLAR].[dbo].[tresumen]#(lf)"])
in
    Origen