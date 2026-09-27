-- #459: testler geliştirme verisinin içine yazmasın diye AYRI bir veritabanı.
-- Aynı konteyner, aynı port; yalnızca veritabanı adı farklı (`grind_test`).
--
-- DİKKAT: bu betik YALNIZCA volume ilk kez oluşturulurken çalışır. Var olan bir kurulumda
-- elle bir kez:
--   docker exec grind-db psql -U grind -d grind -c 'CREATE DATABASE grind_test OWNER grind'
CREATE DATABASE grind_test OWNER grind;
