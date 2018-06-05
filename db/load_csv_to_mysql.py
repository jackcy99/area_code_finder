#!/usr/bin/env python

import mysql.connector, csv 
import datetime, os, sys, time, json, logging, logging.handlers

# prepare log
MYLOG_FILE = "/tmp/load_csv-to_mysql.log"
mylog_handler = logging.handlers.RotatingFileHandler(MYLOG_FILE, maxBytes = 1024*1024, backupCount = 5)  
mylog_fmt = "%(asctime)s - %(filename)s:%(lineno)s - %(name)s - %(message)s"  
mylog_formatter = logging.Formatter(mylog_fmt)   
mylog_handler.setFormatter(mylog_formatter)    
mylogger = logging.getLogger("load_csv-to_mysql")
mylogger.addHandler(mylog_handler)         
mylogger.setLevel(logging.DEBUG)
mylogger.info("load csv to mysql start")

# aurora settings 
rds_endpoint_config_file = "/home/ec2-user/myapp/myapp/db/db_cluster_endpoint.json"
try : 
    with open(rds_endpoint_config_file, 'r') as f:
        conf = json.load(f)
    endpoint_str = conf["db_cluster_endpoint"]
except Exception as e:
    print("Fail to read RDS endpoint URL %s", rds_endpoint_config_file)
#mysql_endpoint = "ct1c5pfuqxcpjjy.ccmonfdvzpe4.us-west-2.rds.amazonaws.com"
mysql_endpoint = endpoint_str
mysql_user = "dbuser"
msyql_password = "12345678"
mysql_dbname = "areacodedb"
mysql_createtablestatement = "CREATE TABLE IF NOT EXISTS areacodetable (area_code INT NOT NULL PRIMARY KEY, location VARCHAR(256))"

# creating the areacode table
try:
    cnx = mysql.connector.connect(host=mysql_endpoint, user=mysql_user, password=msyql_password, database=mysql_dbname)
    cursor = cnx.cursor()
    cursor.execute(mysql_createtablestatement)
    print("sucessfully connected to rds. endpoint:[%s][%s]", mysql_endpoint, mysql_dbname)
    mylogger.info("sucessfully connected to rds. endpoint:[%s][%s]", mysql_endpoint, mysql_dbname)
except mysql.connector.Error as err:
  print("Something went wrong: {}".format(err))
  mylogger.error("Something went wrong: {}".format(err))

# check if table is null
data_file_path= "/home/ec2-user/myapp/myapp/db/areacode.csv"
try :
    cursor.execute ("SELECT * FROM areacodetable")
    data = cursor.fetchall()
    if (len(data)>0) :
        print("Data has been loaded")
        mylogger.info("Data has been loaded")
    else :
        print("No data in table. Start to load data file %s", data_file_path)
        mylogger.info("No data in table. Start to load data file %s", data_file_path)
        csvfile= open(data_file_path)
        reader = csv.DictReader(csvfile)
        i = 0
        for row in reader:
            if (i >0) : 
                data_load_statement = "INSERT INTO areacodetable (area_code, location) VALUES(" + row["area_code"] + ", \"" + row["location"] + "\")"
                cursor.execute (data_load_statement)
                print(data_load_statement)
                mylogger.info(data_load_statement)
            i+=1
except Exception as e:
    print(e.message)
    mylogger.error(e.message)
 

cnx.commit()
cursor.close()

