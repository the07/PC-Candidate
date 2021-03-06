#!/bin/bash

set -ev

docker-compose -f ./docker-compose.yaml up -d

export FABRIC_START_TIMEOUT=10

sleep ${FABRIC_START_TIMEOUT}

#Create a channel
docker exec cli peer channel create -o orderer.example.com:7050 -c mychannel -f channel-artifacts/channel.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
#Add peer0.org1 to channel
docker exec cli peer channel join -b mychannel.block

#update anchor peer of peer0.org1
docker exec cli peer channel update -o orderer.example.com:7050 -c mychannel -f channel-artifacts/Org1MSPanchors.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

#Download the NACL package
docker exec cli go get golang.org/x/crypto/nacl/box/

#Install chaincode on peer0.org1
docker exec cli peer chaincode install -n peoplechain -v 1.0 -p github.com/chaincode/

#Instantiate chaincode on channel
docker exec cli peer chaincode instantiate -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n peoplechain -v 1.0 -c '{"Args":[""]}' -P "OR ('Org1MSP.member','Org2MSP.member','Org3MSP.member')"


