openssl genrsa 2048 > jackcy99-privatekey.pem
openssl req -new -key privatekey.pem -out jackcy99-csr.pem
openssl x509 -req -days 365 -in jackcy99-csr.pem -signkey jackcy99-privatekey.pem -out jackcy99-server.crt
aws acm import-certificate --certificate file://./jackcy99-server.crt --private-key file://./jackcy99-privatekey.pem
