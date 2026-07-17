let
    Origen = Sql.Database("bnvsofsql\sql_2", "SQLLAR", [Query="select *#(lf)from SQLLAR.dbo.contratosact"])
in
    Origen