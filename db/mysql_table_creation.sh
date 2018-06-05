USE areacodedb;
create table areacodetable ( area_code int not null primary key,  location varchar(256));
LOAD DATA LOCAL INFILE '/workspace/myproject2/myapp/areacode.txt' INTO TABLE areacodetable FIELDS TERMINATED BY '\t' LINES TERMINATED BY '\n' (area_code, location);

