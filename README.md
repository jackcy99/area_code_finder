# Area Code Location Finder
### General Introduction
This applicaton will find a location against 3 digit telephone area code. When we receive a unkown call, we don't know where it called from just by looking at the number. This app will search the location by provided area code. I've uploaded nearly 400 area codes and locations in backend database. 
  - Search location by telephone area code
  - The URL is accessible over a secure connection (self-signed certs)
  - Web applications are deployed across at least two availability zones
  - Web applciations are deployed via auto scaling group with ELB
  - Nearly 400 area codes and locations are stored in Aurora RDS 
  - Database is deployed in multi-AZs
  - Use existing stacks like node.js Express
  - Automatically deploy full web application stack on AWS via CloudFormation

### Landing Zone Design 
![image](https://github.com/jackcy99/area_code_finder/blob/master/Readme/Slide4.PNG)

# Demonstration URL
- Area Code Finder demo URL

    ```
    https://cfn-acf-0-acfelast-sfemxr27geys-1133434328.us-east-1.elb.amazonaws.com:3001/
    ```
    
    - Homepage (web node 172-24-20-124 at AZ2)
    ![image](https://github.com/jackcy99/area_code_finder/blob/master/Readme/00_initiallogin.PNG)
    
    - Search Result (web node 172-24-20-124 at AZ2)
    ![image](https://github.com/jackcy99/area_code_finder/blob/master/Readme/01_Result.PNG)
    
    - No Search Result (web node 172-24-20-124 at AZ2)
    ![image](https://github.com/jackcy99/area_code_finder/blob/master/Readme/02_ErrorHandling.PNG)
    
    - Homepage (web node 172-24-10-99 at AZ1)
    ![image](https://github.com/jackcy99/area_code_finder/blob/master/Readme/03_anotherAZ.PNG)

# CloutdFormation Scripts Functionalities 
The sciprts of CloudFormation will achieve following tasks:
- Full web application stack is auto-deployed via CloudFormation, by providing only 8 parameters and 1 click to implement CloudFormation
- Leverage intrinsic functions to avoid hard coding
- leverage cfn-init, cfn-signal and user data to install packages and create files
- ELB and ASG are automatically configured in CloudFormation
- RDS Aurora multi-AZs cluster/instance are automatically created by CloudFormation. Table and data are created and loaded automatically by User Data + Python scripts.

# Auto-deploy via CloudFormation
- Create stack by using CloudForamtion script in us-west-2
- Provide proper parameters
    - Key Pair：
        Must select a valid key pair    
    - AMI ID：
        Pre-bake AMI according to below instruction
    - Certification:
    
        Must select a valid certificate from ACM

        ```
        arn:aws:acm:us-west-2:xxx:certificate/xxx-xxx-xxx-xxx-xxx
        ```
        
    - HTTP Port Number：
        Default is 3000 
    - HTTPS Port Number：
        Default is 3001 
    - Instance Type：
        Default is t2.small
    - DB Instance Type：
        Default is db.t2.small
    - Instance Profile：
        Must select a valid instance profile

- Browse to "Outputs" tab in CloudFormation
    The output should be something like following :
    ```
    https://cfn-acf-0-acfelast-sfemxr27geys-1133434328.us-east-1.elb.amazonaws.com:3001/
    ```    

# CloudFormation - infrastructure as code
### Automated Deployment Code (CloudFormation)
- Aurora Cluster
    ```
    "acfrdsdbcluster" : {
        "Type" : "AWS::RDS::DBCluster",
        "Properties" : {
            "AvailabilityZones" : [ {"Fn::Join": ["",[{ "Ref": "AWS::Region" },"a"]]}, {"Fn::Join": ["",[{ "Ref": "AWS::Region" },"b"]]}],
            "MasterUsername" : "dbuser",
            "MasterUserPassword" : "12345678", 
            "DatabaseName" : "areacodedb",
            "Engine" : "aurora",
            "DBSubnetGroupName" : { "Ref" : "acfsubnetgroup" },   
            "VpcSecurityGroupIds" : [{ "Ref" : "ACFSGDBGeneral" }]
        },
        "DependsOn" : ["acfsubnetgroup", "ACFSGDBGeneral"],
        "DeletionPolicy" : "Delete"
    },
    ... ...
    ```
    
- Aurora Instance
    ```
    "acfrdsdbinstance1" : {
        "Type" : "AWS::RDS::DBInstance",
        "Properties" : {
            "DBSubnetGroupName" : {
                "Ref" : "acfsubnetgroup"
            },
            "Engine" : "aurora",
            "DBClusterIdentifier" : {
                "Ref" : "acfrdsdbcluster"
            },
            "PubliclyAccessible" : "false",
            "DBInstanceClass" : { "Ref" : "ACFDBInstanceClass" },          
            "Tags" : [
                { "Key" : "Name", "Value" : "acfrdsdbinstance1" },
                { "Key" : "Application", "Value" : "Area Code Finder - Primary DB instance" },
                { "Key" : "E-mail", "Value" : "jackcy99@hotmail.com" }
            ]
        },
        "DependsOn" : "acfrdsdbcluster",
        "DeletionPolicy" : "Delete"
    },
    ... ...
    ```
    
- ELB with HTTPS Listener
    ```
    "ACFElasticLoadBalancer": {
        "Type": "AWS::ElasticLoadBalancing::LoadBalancer",
        "Properties": {
            ... ...
            "Listeners": [
            {
                "InstancePort": { "Ref" : "ACFHTTPSPORT" },
                "InstanceProtocol" : "HTTPS",
                "LoadBalancerPort": { "Ref" : "ACFHTTPSPORT" },
                "Protocol": "HTTPS",
                "SSLCertificateId" : { "Ref" :  "ACFSSLCertificationID" }
            }
            ],
            ... ...
        },
    ... ...
    ```
    
- Install packages, create files and implement commands in User data
    ```
    ... ...
    "Metadata" : {
        "Comment" : "Install packages, create files and exec commands",
        "AWS::CloudFormation::Init" : {
            "config" : {
                "packages" : {
                    "yum" : {
                        "httpd" : []
                    }
                },
                "services" : {
                    "sysvinit" : {
                        "httpd"    : { "enabled" : "true", "ensureRunning" : "true" }
                    }
                }
            }   
        }
    },
    ... ...
    "Properties": {
            ... ...
            "UserData": {
                "Fn::Base64": {
                    "Fn::Join": [
                        "",
                        [
                            "#!/bin/bash\n",
                            "yum update -y aws-cfn-bootstrap\n",
                            "yum update -y aws-cli\n",
                   
                            "/opt/aws/bin/cfn-init -v ",
                            "         --stack ", { "Ref" : "AWS::StackName" },
                            "         --resource ACFLaunchConfiguration ",
                            "         --region ", { "Ref" : "AWS::Region" }, "\n",
                            "/opt/aws/bin/cfn-signal -e $? ",
                            "         --stack ", { "Ref" : "AWS::StackName" },
                            "         --resource ACFAutoScalingGroup ",
                            "         --region ", { "Ref" : "AWS::Region" }, "\n",

                            "sudo echo \"\" > /tmp/dbname.txt\n",
                            "sudo chmod 666 /tmp/dbname.txt\n",
                            "sudo echo '", { "Fn::GetAtt" : [ "acfrdsdbinstance1", "Endpoint.Address" ] }, "' >/tmp/dbname.txt\n",
                            "sudo echo \"\" > /home/ec2-user/myapp/myapp/db/db_cluster_endpoint.json\n",
                            "sudo chmod 666 /home/ec2-user/myapp/myapp/db/db_cluster_endpoint.json\n",
                            "sudo echo \"{\\\"db_cluster_endpoint\\\" : \\\"", { "Fn::GetAtt" : [ "acfrdsdbinstance1", "Endpoint.Address" ] }, "\\\"}\"", ">/home/ec2-user/myapp/myapp/db/db_cluster_endpoint.json\n",
                            "sudo reboot\n"
                        ]
                    ]
                }
            }
        }
        ... ...
    },
    ... ...
    ```
    
    To verify if "httpd" service is installed and running by cfn-init, execute the following command
    ```
    sudo service httpd status
    ```
    
    Something will return as below :

    "httpd (pid  2782) is running..."

- ASG with Launch Configuration and ELB
    ```
    "ACFAutoScalingGroup": {
        "Type": "AWS::AutoScaling::AutoScalingGroup",
        "Properties": {
            "AutoScalingGroupName" : "ACF_AutoScalingGroup",
            "AvailabilityZones" : [ {"Fn::Join": ["",[{ "Ref": "AWS::Region" },"a"]]}, {"Fn::Join": ["",[{ "Ref": "AWS::Region" },"b"]]}],
            "DesiredCapacity": "2",
            "HealthCheckGracePeriod": "180",
            "HealthCheckType": "EC2",
            "LaunchConfigurationName": {"Ref": "ACFLaunchConfiguration"},
            "MaxSize": "2",
            "MinSize": "1",
            "LoadBalancerNames" :  [{"Ref": "ACFElasticLoadBalancer"}],
            "Tags": [
                { "Key" : "Name", "Value" : "ACF_AutoScalingGroup", "PropagateAtLaunch" : "true" },
                { "Key" : "Application", "Value" : "Area Code Finder (ACF) - Autoscaling Group", "PropagateAtLaunch" : "true" },
                { "Key" : "E-mail", "Value" : "jackcy99@hotmail.com", "PropagateAtLaunch" : "true" }
            ],
            "VPCZoneIdentifier": [{ "Ref" : "ACFSBPUB1722410" }, { "Ref" : "ACFSBPUB1722420" }]
        },
        "UpdatePolicy": {
            "AutoScalingRollingUpdate": {
                "MaxBatchSize": 1,
                "MinInstancesInService": 1
            }
        },
        "DependsOn" : ["ACFLaunchConfiguration"]
    }
    ... ...
    ```
    
- Outputs
    ```
    "Outputs" : {
        "WebsiteURL" : {
            "Value" : { "Fn::Join" : ["", ["https://", { "Fn::GetAtt" : [ "ACFElasticLoadBalancer", "DNSName" ]}, ":3001" ]]},
            "Description" : "Area Code Finder Website"
        }
    }
    ```
    
### Python scripts to create DB table and load data automatically
- Read Aurora cluster endpoint from configuration file that is created in User Data scripts
    ```
    ... ...
    rds_endpoint_config_file = "/home/ec2-user/myapp/myapp/db/db_cluster_endpoint.json"
    try :
        with open(rds_endpoint_config_file, 'r') as f:
            conf = json.load(f)
        endpoint_str = conf["db_cluster_endpoint"]
    except Exception as e:
    print("Fail to read RDS endpoint URL %s", rds_endpoint_config_file)
    }
    ... ...
    ```
    
- Connect to Aurora DB cluster
    ``` 
    ... ...
    mysql_endpoint = endpoint_str
    mysql_user = "dbuser"
    msyql_password = "12345678"
    mysql_dbname = "areacodedb"
    cnx = mysql.connector.connect(host=mysql_endpoint, user=mysql_user, password=msyql_password, database=mysql_dbname)
    cursor = cnx.cursor()
    ... ...
    ``` 
- Create areacodedb.areacodetable
    ```
    ... ...
    mysql_createtablestatement = "CREATE TABLE IF NOT EXISTS areacodetable (area_code INT NOT NULL PRIMARY KEY, location VARCHAR(256))"
    cursor.execute(mysql_createtablestatement)
    ... ...
    ```
    
- Load initial data from .csv file
    ```
    ... ...
    data_file_path= "/home/ec2-user/myapp/myapp/db/areacode.csv"
    cursor.execute ("SELECT * FROM areacodetable")
    data = cursor.fetchall()
    if (len(data)>0) :
        print("Data has been loaded")
    else :
        print("No data in table. Start to load data file %s", data_file_path)
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
    ... ...
    ```
    
- Commit and close
    ```
    cnx.commit()
    cursor.close()
    ```
    
- Grant execution priviliege to load_csv_to_mysql.py
    ```
    sudo chmod 755 /home/ec2-user/myapp/myapp/db/load_csv_to_mysql.py
    ``` 
    
- Crontab setting
    ```
    @reboot /home/ec2-user/myapp/myapp/db/load_csv_to_mysql.py
    ```   
    
# Web application deployment
![image](https://github.com/jackcy99/area_code_finder/blob/master/Readme/Slide5.PNG)
### Web Application Code (Node.js/Express)
- /bin/www
    ```
    ... ...
    var https = require('https');
    var pri_key = fs.readFileSync('/workspace/myproject2/myapp/certificates/jackcy99-privatekey.pem'); 
    var certificate = fs.readFileSync('/workspace/myproject2/myapp/certificates/jackcy99-server.crt'); 
    var sslport = normalizePort(process.env.PORT || '3001');
    var httpsServer = https.createServer(options, app, function(){
        console.log('set up https connection');
    });
    httpsServer.listen(sslport, function() {
        console.log('https connected at ' + sslport);
    });
    ... ...
    ``` 
    
- app.js
    ```
    ... ...
    var indexRouter = require('./routes/index');
    app.use('/', indexRouter);
    ... ...
    ```
    
- /views/index.pug
    ```
    ... ...
    p Welcome to #{title}
    ... ...
    p Created by jackcy99@hotmail.com (#{hostname})
    form(method='POST' action='/search_area_code')
        div.form-group
        label(for='areacode') Please type in the area code:
        input#areacode.form-control(type='number', placeholder='604' name='myareacode' required='true' value=604 max=999 min=1)
    ... ...
    ```
    
- /routes/index.js
    ```
    ... ...
    /* Specify hostname in ELB */
    var my_fqdn = os.hostname() + ''; 
    router.get('/', function(req, res, next) {
        res.render('index', { title: 'Express - North American area codes finder', hostname: my_fqdn});
    });
    ... ...
    var mycontroller = require('../controller/areacodeController');
    router.post("/search_area_code", mycontroller.searchareacode);
    ... ...
    ```
    
- /views/areacode_form.pug
    ```
    ... ...
    form(method='POST' action='/search_area_code')
        div.form-group
            label(for='areacode') Please type in the area code:
        button.btn.btn-primary(type='submit') Find Location
    ... ...
    p The location of this area code (#{myareacode}) is :
    p #{mylocation}
    ... ...
    ```
    
- /controller/areacodeController.js
    ```
    ... ...
        fs.readFile('/home/ec2-user/myapp/myapp/db/db_cluster_endpoint.json', 'utf8', function (err, jdata) {
            var jObj = JSON.parse(jdata)
            db_endpoint_url = jObj.db_cluster_endpoint
        ... ...
        app.locals.hostname = db_endpoint_url;
        app.locals.username = 'dbuser';
        app.locals.password = '12345678';
        app.locals.port = '3306';
        app.locals.database = 'areacodedb';
         ... ...
        var connection = mysql.createConnection({
            host     : app.locals.hostname,
            user     : app.locals.username,
            password : app.locals.password,
            port     : app.locals.port,
            database : app.locals.database
        });
        connection.connect(function(err) {
        ... ...
        });
        var query_sql = 'SELECT location FROM areacodetable WHERE area_code=?';
        connection.query(query_sql, req_area_code, function (err, results) {
        if (results.length>0) {
            for (var my_index in results) {
                city_name = results[my_index].location;
            }
            str_result = city_name;
        }
        ... ...
        res.render('areacode_form', { title: 'Express - North American area codes finder', hostname: my_fqdn, myareacode: req_area_code, mylocation: str_result});
        ... ...
    ```

### Prepare and create Web Application AMI 
The following steps explain how to create area code finder AMI :
- Launch an "Amazon Linux AMI 2018.03.0 (HVM), SSD Volume Type" (ami-e251209a) in us-west-2 region
- Install latest updates
    ```
    sudo yum update -y
    ```
    
- Install Node.js

    https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-up-node-on-ec2-instance.html
    ```
    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash
    . ~/.nvm/nvm.sh
    nvm install 8.11.2
    nvm install --lts
    ```
    
- Install Express    
    ```
    sudo mkdir myapp
    sudo chmod 777 /home/ec2-user/myapp/
    cd /home/ec2-user/myapp/
    npm install express --save
    npm install express-generator -g
    express --view=pug myapp
    cd myapp
    npm install
    ```
    
- Install express-validator
    ```
    npm install express-validator
    ```
    
- Install mysql
    ```
    npm install mysql
    ```
    
- Install PM2
    ```
    npm install pm2@latest -g
    ```
    
- Install Git
    ```
    sudo yum install git -y
    ```
    
- Clone code from GitHub repository
    ```
    git clone https://github.com/jackcy99/area_code_finder
    ``` 
    
- Install MySQL
    ```
    sudo yum install mysql -y
    sudo yum install python-pip python-wheel -y
    sudo pip install mysql-connector
    ```   
    
- Sync the following scripts with latest version in Git master
    ```
    ./app.js
    ./bin/*
    ./routes/*.*
    ./views/*.*
    ./controller/*.*
    ./db/*.*
    ./certificates/*.*
    ```    
    
- Configure pm2 to start web application at reboot
    ```
    pm2 startup amazon
    sudo env PATH=$PATH:/home/ec2-user/.nvm/versions/node/v8.11.1/bin /home/ec2-user/.nvm/versions/node/v8.11.1/lib/node_modules/pm2/bin/pm2 startup amazon -u ec2-user --hp /home/ec2-user
    pm2 start /home/ec2-user/myapp/myapp/bin/www
    pm2 save
    ```    

# Tech Reference
This assignment uses some open source projects to work properly:
* [node.js] - a JavaScript runtime built on Chrome's V8 JavaScript engine
* [Express] - fast node.js network app framework
* [pm2] - advanced, production process manager for Node.js