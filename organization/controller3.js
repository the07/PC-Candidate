var express       = require('express');        // call express
var app           = express();                 // define our app using express
var bodyParser    = require('body-parser');
var http          = require('http')
var fs            = require('fs');
var Fabric_Client = require('fabric-client');
var Fabric_CA_Client = require('fabric-ca-client');

var path          = require('path');
var util          = require('util');
var os            = require('os');

const basePath = path.resolve(__dirname, '../peoplechain/certs');
const readCryptoFile = filename => fs.readFileSync(path.resolve(basePath, filename)).toString();

var fabric_client = new Fabric_Client();
var fabric_ca_client = null;

var channel = fabric_client.newChannel('mychannel');
var peer = fabric_client.newPeer('grpcs://localhost:7051', {
  pem: readCryptoFile('peer1.pem'),
  'ssl-target-name-override': 'peer0.org1.example.com'
});
channel.addPeer(peer);

var orderer = fabric_client.newOrderer('grpcs://localhost:7050', {
  pem: readCryptoFile('Orderer.pem'),
  'ssl-target-name-override': 'orderer.example.com'
});
channel.addOrderer(orderer);

var store_path = path.join(os.homedir(), '.hfc-key-store');
console.log('Store path: ' + store_path);

var user_data = {};



module.exports = (function() {
    return {
        get_all_users: function(req, res) {
            
            var user = req.params.user;
            var member_user = null;
            var tx_id = null;
            Fabric_Client.newDefaultKeyValueStore({ path: store_path
            }).then((state_store) => {
                fabric_client.setStateStore(state_store);
                var crypto_suite = Fabric_Client.newCryptoSuite();

                var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
                crypto_suite.setCryptoKeyStore(crypto_store);
                fabric_client.setCryptoSuite(crypto_suite);

                return fabric_client.getUserContext(user, true);

            }).then((user_from_store) => {
                if (user_from_store && user_from_store.isEnrolled()) {
                console.log('Successfully loaded user from persistence');
                member_user = user_from_store;
                } else {
                throw new Error('FAiled to get user, register user first');
                }

                const request = {
                chaincodeId: 'peoplechain',
                txId: tx_id,
                fcn: 'getAllUsers',
                args: []
                };

                return channel.queryByChaincode(request);
            }).then((query_responses) => {
                console.log("Query has completed cheching results");

                if (query_responses && query_responses.length == 1) {
                if (query_responses[0] instanceof Error) {
                    console.error("error from query = ", query_responses[0]);
                    res.send("Not found ")
                } else {
                    console.log("Response is ", query_responses[0].toString());
                    res.json(JSON.parse(query_responses[0].toString()));
                }
                } else {
                console.log("No payloads were returned from the query");
                res.send("Could not find any organization details");
                }
            }).catch((err) => {
                console.error('Failed to query successfully :: ' + err);
                res.send("Could not find any organization details .");
            });
        },
        register_user: function(req, res) {
            var array = req.params.user.split("-");
            var member_user = null;
            var admin_user = null;
            var tx_id = null;

            Fabric_Client.newDefaultKeyValueStore({path:store_path
            }).then((state_store) => {
              fabric_client.setStateStore(state_store);
              var crypto_suite = Fabric_Client.newCryptoSuite();
              var crypto_store = Fabric_Client.newCryptoKeyStore({path:store_path});
      
              crypto_suite.setCryptoKeyStore(crypto_store);
              fabric_client.setCryptoSuite(crypto_suite);
              var tlsOptions = {
                trustedRoots: [],
                verify: false
              };
      
              fabric_ca_client = new Fabric_CA_Client('https://localhost:7054', tlsOptions , 'ca.org1.example.com', crypto_suite);
      
              return fabric_client.getUserContext('admin', true);
            }).then((user_from_store) => {
              if (user_from_store && user_from_store.isEnrolled()){
                console.log('Admin loaded from persistence');
                admin_user = user_from_store;
              } else {
                throw new Error('Failed to get admin... register and enroll admin');
              }
      
              return fabric_ca_client.register({enrollmentID: array[0], enrollmentSecret: array[1], affiliation: 'org1.department1'}, admin_user);
            }).then((secret) => {
              console.log("Successfully registered user");
              user_data.secret = secret;
      
              return fabric_ca_client.enroll({enrollmentID: array[0], enrollmentSecret: array[1]});
            }).then((enrollment) => {
              console.log('Successfully enrolled user');
      
              return fabric_client.createUser({
                username: array[0],
                mspid: 'Org1MSP',
                cryptoContent: {
                  privateKeyPEM: enrollment.key.toBytes(),
                  signedCertPEM: enrollment.certificate
                }
              });
            }).then((user) => {
              member_user = user;
              return fabric_client.setUserContext(member_user);
            }).then(() => {
              console.log('User registered and enrolled');
              res.send('Success');
            }).catch((err) => {
              console.error('Failed to register: ' + err);
              if(err.toString().indexOf('Authorization') > -1) {
                console.error('Authorization failures may be caused by having admin credentials from a previous CA instance.\n' +
                'Try again after deleting the contents of the store directory '+ store_path);
              }
      
            })
            
        }, // Next function here

        generateKeyPair: function(req, res) {
            console.log('Generating user key');

            var array = req.params.user.split('-');
            var url = array[0];
            var password = array[1];

            var member_user = null;
            var tx_id = null;

            
            Fabric_Client.newDefaultKeyValueStore({ path: store_path
            }).then((state_store) => {
                fabric_client.setStateStore(state_store);
                var crypto_suite = Fabric_Client.newCryptoSuite();
                var crypto_store = Fabric_Client.newCryptoKeyStore({path:store_path});
                crypto_suite.setCryptoKeyStore(crypto_store);
                fabric_client.setCryptoSuite(crypto_suite);

                return fabric_client.getUserContext(url, true);
            }).then((user_from_store) => {
                if (user_from_store && user_from_store.isEnrolled()) {
                console.log('Successfully loaded user from persistence');
                member_user = user_from_store;
                } else {
                throw new Error('Failed tp get user, register user first');
                }

                tx_id = fabric_client.newTransactionID();
                console.log("Assigning transaction id: " + tx_id._transaction_id);
                console.log(url);

                var request = {
                    chaincodeId: 'peoplechain',
                    fcn: 'createOrganization',
                    args: [url, password],
                    txId: tx_id
                };

                return channel.sendTransactionProposal(request)
            }).then((results) => {
                var proposalResponses = results[0];
                var proposal = results[1];
                let isProposalGood = false;
                if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
                isProposalGood = true;
                console.log('Transaction proposal was good');
                var keys = proposalResponses[0].response.payload.toString();
                console.log(proposalResponses[0].response.payload.toString());
                res.json(JSON.parse(keys));
                } else {
                console.error('Transaction proposal was bad');
                }
                if (isProposalGood) {

                var request = {
                    proposalResponses: proposalResponses,
                    proposal: proposal
                };

                var transaction_id_string = tx_id.getTransactionID();
                var promises = [];

                var sendPromise = channel.sendTransaction(request);
                promises.push(sendPromise);

                let event_hub = fabric_client.newEventHub();
                event_hub.setPeerAddr('grpcs://localhost:7053', {
                    pem: readCryptoFile('peer1.pem'),
                    'ssl-target-name-override': 'peer0.org1.example.com'
                });

                let txPromise = new Promise((resolve, reject) => {
                    let handle = setTimeout(() => {
                    event_hub.disconnect();
                    resolve({event_status: 'TIMEOUT'});
                    }, 3000);
                    event_hub.connect();
                    event_hub.registerTxEvent(transaction_id_string, (tx, code) => {

                    clearTimeout(handle);
                    event_hub.unregisterTxEvent(transaction_id_string);
                    event_hub.disconnect();

                    var return_status = {event_status: code, tx_id: transaction_id_string};
                    if (code !== 'VALID') {
                        console.error('The transaction was invalid code = ' + code);
                        resolve(return_status);
                    } else {
                        console.log("The transaction has been committed to peer " + event_hub._ep._endpoint.addr);
                        resolve(return_status);
                    }
                    }, (err) => {
                    reject(new Error('There was a problem with the eventhub ::'+err));
                    });
                });

                promises.push(txPromise);

                return Promise.all(promises);
                } else {
                console.error('Failed to send Proposal  or receive valid response. Response null or status is not 200, Exiting.');
                throw new Error('Failed to send Proposal or reciee valid response. Response null or status is not 200, Exiting.');
                }
            }).then((results) => {
                console.log('Send transaction promise and event listener promise gave been completed.');

                if (results && results[0] && results[0].status === 'SUCCESS') {
                    console.log('Successfully sent transaction to the orderer.');
                } else {
                    console.error('Failed to order the transaction. Error code: ' + response.status);
                }

                if (results && results[1] && results[1].event_status === 'VALID') {
                console.log('Successfully committed the change to the ledger by the peer');
                } else {
                console.log('Transaction failed to be committed to the ledger due to :: ' + results[1].event_status);
                }
            }).catch((err) => {
                console.error("Failed to invoke successfully :: " + err);
            });
        }, //Next function here

        create_profile: function(req, res) {
            var array = req.params.data.split("-");
            var url = array[1];
            var key = array[0];
            console.log(url);
            var data = array[2];
            var member_user = null;
            var tx_id = null;

            Fabric_Client.newDefaultKeyValueStore({ path: store_path
            }).then((state_store) => {
                fabric_client.setStateStore(state_store);
                var crypto_suite = Fabric_Client.newCryptoSuite();
                // use the same location for the state store (where the users' certificate are kept)
                // and the crypto store (where the users' keys are kept)
                var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
                crypto_suite.setCryptoKeyStore(crypto_store);
                fabric_client.setCryptoSuite(crypto_suite);

                // get the enrolled user from persistence, this user will sign all requests
                return fabric_client.getUserContext(url, true);
            }).then((user_from_store) => {
                if (user_from_store && user_from_store.isEnrolled()) {
                console.log('Successfully loaded user from persistence.');
                member_user = user_from_store;
                } else {
                throw new Error('Failed to get user, register User');
                }

                tx_id = fabric_client.newTransactionID();
                console.log("Assigning transaction id: ", tx_id._transaction_id);
                console.log(data);


                var request = {
                chaincodeId: 'peoplechain',
                fcn: 'updateOrganizationProfile',
                args: [key, data],
                txId: tx_id,
                };

                return channel.sendTransactionProposal(request);
            }).then((results) => {
                var proposalResponses = results[0];
                var proposal = results[1];
                let isProposalGood = false;
                if (proposalResponses && proposalResponses[0].response &&
                proposalResponses[0].response.status === 200) {
                    isProposalGood = true;
                    console.log('Transaction proposal was good');
                } else {
                    console.error('Transaction proposal was bad');
                }
                if (isProposalGood) {
                console.log(util.format(
                    'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
                    proposalResponses[0].response.status, proposalResponses[0].response.message));

                // build up the request for the orderer to have the transaction committed
                var request = {
                    proposalResponses: proposalResponses,
                    proposal: proposal
                };

                // set the transaction listener and set a timeout of 30 sec
                // if the transaction did not get committed within the timeout period,
                // report a TIMEOUT status
                var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
                var promises = [];

                var sendPromise = channel.sendTransaction(request);
                promises.push(sendPromise); //we want the send transaction first, so that we know where to check status

                // get an eventhub once the fabric client has a user assigned. The user
                // is required bacause the event registration must be signed
                let event_hub = fabric_client.newEventHub();
                event_hub.setPeerAddr('grpcs://localhost:7053', {
                    pem: readCryptoFile('peer1.pem'),
                    'ssl-target-name-override': 'peer0.org1.example.com'
                });

                // using resolve the promise so that result status may be processed
                // under the then clause rather than having the catch clause process
                // the status
                let txPromise = new Promise((resolve, reject) => {
                    let handle = setTimeout(() => {
                    event_hub.disconnect();
                    resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
                    }, 3000);
                    event_hub.connect();
                    event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
                    // this is the callback for transaction event status
                    // first some clean up of event listener
                    clearTimeout(handle);
                    event_hub.unregisterTxEvent(transaction_id_string);
                    event_hub.disconnect();

                    // now let the application know what happened
                    var return_status = {event_status : code, tx_id : transaction_id_string};
                    if (code !== 'VALID') {
                        console.error('The transaction was invalid, code = ' + code);
                        resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
                    } else {
                        console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
                        resolve(return_status);
                    }
                    }, (err) => {
                    //this is the callback if something goes wrong with the event registration or processing
                    reject(new Error('There was a problem with the eventhub ::'+err));
                    });
                });
                promises.push(txPromise);

                return Promise.all(promises);
                } else {
                console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
                throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
                }
            }).then((results) => {
                console.log('Send transaction promise and event listener promise have completed');
                console.log(results);
                if (results && results[0] && results[0].status === 'SUCCESS') {
                console.log('Successfully sent transaction to the orderer.');
                } else {
                console.error('Failed to order the transaction. Error code: ' + response.status);
                }
            
                if (results && results[1] && results[1].event_status === 'VALID') {
                console.log('Successfully committed the change to the ledger by the peer');
                } else {
                console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
                }

                res.send('SUCCESS');

            }).catch((err) => {
                console.error('Failed to invoke successfully :: ' + err);
            });
        }, //Next function here

        get_org_data: function(req, res) {
            var array = req.params.data.split("-");
            var user = array[0];
            var key = array[1];
            var member_user = null;
            var tx_id = null;
            Fabric_Client.newDefaultKeyValueStore({ path: store_path
            }).then((state_store) => {
                fabric_client.setStateStore(state_store);
                var crypto_suite = Fabric_Client.newCryptoSuite();

                var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
                crypto_suite.setCryptoKeyStore(crypto_store);
                fabric_client.setCryptoSuite(crypto_suite);

                return fabric_client.getUserContext(user, true);

            }).then((user_from_store) => {
                if (user_from_store && user_from_store.isEnrolled()) {
                console.log('Successfully loaded user from persistence');
                member_user = user_from_store;
                } else {
                throw new Error('FAiled to get user, register user first');
                }

                const request = {
                chaincodeId: 'peoplechain',
                txId: tx_id,
                fcn: 'getOrgsData',
                args: [key]
                };

                return channel.queryByChaincode(request);
            }).then((query_responses) => {
                console.log("Query has completed cheching results");

                if (query_responses && query_responses.length == 1) {
                if (query_responses[0] instanceof Error) {
                    console.error("error from query = ", query_responses[0]);
                    res.send("Could not locate record")
                } else {
                    console.log("Response is ", query_responses[0].toString());
                    res.send(query_responses[0].toString());
                }
                } else {
                console.log("No payloads were returned from the query");
                res.send("Could not locate record");
                }
            }).catch((err) => {
                console.error('Failed to query successfully :: ' + err);
                res.send("Could not locate record");
            });
        }, //Next function here

        get_all_record: function(req, res) {
            var user = req.params.user;
            var member_user = null;
            var tx_id = null;

            Fabric_Client.newDefaultKeyValueStore({ path: store_path
            }).then((state_store) => {
              fabric_client.setStateStore(state_store);
              var crypto_suite = Fabric_Client.newCryptoSuite();
              var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
      
              crypto_suite.setCryptoKeyStore(crypto_store);
              fabric_client.setCryptoSuite(crypto_suite);
      
              return fabric_client.getUserContext(user, true);
            }).then((user_from_store) => {
              if (user_from_store && user_from_store.isEnrolled()) {
                console.log("Successfully loaded user from persistence");
                member_user = user_from_store;
              } else {
                throw new Error("Failed to get user, register user.")
              }
      
              const request = {
                chaincodeId: 'peoplechain',
                txId: tx_id,
                fcn: 'queryAllRecord',
                args: ['']
              };
      
              return channel.queryByChaincode(request);
            }).then((query_responses) => {
              console.log('Query has completed checking results');
      
              if (query_responses && query_responses.length == 1) {
                if (query_responses[0] instanceof Error) {
                  consoe.error("Error from query: ", query_responses[0]);
                } else {
                  console.log("Response is ", query_responses[0].toString());
                  res.json(JSON.parse(query_responses[0].toString()));
                }
              } else {
                console.log("No payloads were returned from the query")
              }
            }).catch((err) => {
              console.error("Failed to query successfully :: " + err);
            });
        }, //
        sign_record: function(req, res) {
            var array = req.params.data.split("-");
            var user = array[0];
            var id = array[1];
            var member_user = null;
            var tx_id = null;

            Fabric_Client.newDefaultKeyValueStore({ path: store_path
            }).then((state_store) => {
                // assign the store to the fabric client
                fabric_client.setStateStore(state_store);
                var crypto_suite = Fabric_Client.newCryptoSuite();
                // use the same location for the state store (where the users' certificate are kept)
                // and the crypto store (where the users' keys are kept)
                var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
                crypto_suite.setCryptoKeyStore(crypto_store);
                fabric_client.setCryptoSuite(crypto_suite);

                // get the enrolled user from persistence, this user will sign all requests
                return fabric_client.getUserContext(user, true);
            }).then((user_from_store) => {
                if (user_from_store && user_from_store.isEnrolled()) {
                    console.log('Successfully loaded user from persistence');
                    member_user = user_from_store;
                } else {
                    throw new Error('Failed to get user.... run registerUser.js');
                }

                // get a transaction id object based on the current user assigned to fabric client
                tx_id = fabric_client.newTransactionID();
                console.log("Assigning transaction_id: ", tx_id._transaction_id);


                // createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
                // changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
                // must send the proposal to endorsing peers
                var request = {
                    //targets: let default to the peer assigned to the client
                    chaincodeId: 'peoplechain',
                    fcn: "signRecord",
                    args: [id],
                    txId: tx_id,
                };

                // send the transaction proposal to the peers
                return channel.sendTransactionProposal(request);
            }).then((results) => {
                var proposalResponses = results[0];
                var proposal = results[1];
                let isProposalGood = false;
                if (proposalResponses && proposalResponses[0].response &&
                    proposalResponses[0].response.status === 200) {
                        isProposalGood = true;
                        console.log('Transaction proposal was good');
                        console.log(proposalResponses[0].response.payload.toString())
                    } else {
                        console.error('Transaction proposal was bad');
                    }
                if (isProposalGood) {
                    console.log(util.format(
                        'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
                        proposalResponses[0].response.status, proposalResponses[0].response.message));

                    // build up the request for the orderer to have the transaction committed
                    var request = {
                        proposalResponses: proposalResponses,
                        proposal: proposal
                    };

                    // set the transaction listener and set a timeout of 30 sec
                    // if the transaction did not get committed within the timeout period,
                    // report a TIMEOUT status
                    var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
                    var promises = [];

                    var sendPromise = channel.sendTransaction(request);
                    promises.push(sendPromise); //we want the send transaction first, so that we know where to check status

                    // get an eventhub once the fabric client has a user assigned. The user
                    // is required bacause the event registration must be signed
                    let event_hub = fabric_client.newEventHub();
                    event_hub.setPeerAddr('grpcs://localhost:7053', {
                        pem: readCryptoFile('peer1.pem'),
                        'ssl-target-name-override': 'peer0.org1.example.com'
                    });

                    // using resolve the promise so that result status may be processed
                    // under the then clause rather than having the catch clause process
                    // the status
                    let txPromise = new Promise((resolve, reject) => {
                        let handle = setTimeout(() => {
                            event_hub.disconnect();
                            resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
                        }, 3000);
                        event_hub.connect();
                        event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
                            // this is the callback for transaction event status
                            // first some clean up of event listener
                            clearTimeout(handle);
                            event_hub.unregisterTxEvent(transaction_id_string);
                            event_hub.disconnect();

                            // now let the application know what happened
                            var return_status = {event_status : code, tx_id : transaction_id_string};
                            if (code !== 'VALID') {
                                console.error('The transaction was invalid, code = ' + code);
                                resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
                            } else {
                                console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
                                resolve(return_status);
                            }
                        }, (err) => {
                            //this is the callback if something goes wrong with the event registration or processing
                            reject(new Error('There was a problem with the eventhub ::'+err));
                        });
                    });
                    promises.push(txPromise);

                    return Promise.all(promises);
                } else {
                    console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
                    throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
                }
            }).then((results) => {
                console.log('Send transaction promise and event listener promise have completed');
                // check the results in the order the promises were added to the promise all list
                if (results && results[0] && results[0].status === 'SUCCESS') {
                    console.log('Successfully sent transaction to the orderer.');
                    res.send(tx_id.getTransactionID());
                } else {
                    console.error('Failed to order the transaction. Error code: ' + response.status);
                }

                if(results && results[1] && results[1].event_status === 'VALID') {
                    console.log('Successfully committed the change to the ledger by the peer');
                    res.send(tx_id.getTransactionID());
                } else {
                    console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
                }
            }).catch((err) => {
                console.error('Failed to invoke successfully :: ' + err);
            });
        }, //

        decline_record: function(req, res) {
            var array = req.params.data.split("-");
            var user = array[0];
            var id = array[1];
            var member_user = null;
            var tx_id = null;

            Fabric_Client.newDefaultKeyValueStore({ path: store_path
            }).then((state_store) => {
                // assign the store to the fabric client
                fabric_client.setStateStore(state_store);
                var crypto_suite = Fabric_Client.newCryptoSuite();
                // use the same location for the state store (where the users' certificate are kept)
                // and the crypto store (where the users' keys are kept)
                var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
                crypto_suite.setCryptoKeyStore(crypto_store);
                fabric_client.setCryptoSuite(crypto_suite);

                // get the enrolled user from persistence, this user will sign all requests
                return fabric_client.getUserContext(user, true);
            }).then((user_from_store) => {
                if (user_from_store && user_from_store.isEnrolled()) {
                    console.log('Successfully loaded user from persistence');
                    member_user = user_from_store;
                } else {
                    throw new Error('Failed to get user.... run registerUser.js');
                }

                // get a transaction id object based on the current user assigned to fabric client
                tx_id = fabric_client.newTransactionID();
                console.log("Assigning transaction_id: ", tx_id._transaction_id);


                // createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
                // changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
                // must send the proposal to endorsing peers
                var request = {
                    //targets: let default to the peer assigned to the client
                    chaincodeId: 'peoplechain',
                    fcn: "declineRecord",
                    args: [id],
                    txId: tx_id,
                };

                // send the transaction proposal to the peers
                return channel.sendTransactionProposal(request);
            }).then((results) => {
                var proposalResponses = results[0];
                var proposal = results[1];
                let isProposalGood = false;
                if (proposalResponses && proposalResponses[0].response &&
                    proposalResponses[0].response.status === 200) {
                        isProposalGood = true;
                        console.log('Transaction proposal was good');
                        console.log(proposalResponses[0].response.payload.toString())
                    } else {
                        console.error('Transaction proposal was bad');
                    }
                if (isProposalGood) {
                    console.log(util.format(
                        'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
                        proposalResponses[0].response.status, proposalResponses[0].response.message));

                    // build up the request for the orderer to have the transaction committed
                    var request = {
                        proposalResponses: proposalResponses,
                        proposal: proposal
                    };

                    // set the transaction listener and set a timeout of 30 sec
                    // if the transaction did not get committed within the timeout period,
                    // report a TIMEOUT status
                    var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
                    var promises = [];

                    var sendPromise = channel.sendTransaction(request);
                    promises.push(sendPromise); //we want the send transaction first, so that we know where to check status

                    // get an eventhub once the fabric client has a user assigned. The user
                    // is required bacause the event registration must be signed
                    let event_hub = fabric_client.newEventHub();
                    event_hub.setPeerAddr('grpcs://localhost:7053', {
                        pem: readCryptoFile('peer1.pem'),
                        'ssl-target-name-override': 'peer0.org1.example.com'
                    });

                    // using resolve the promise so that result status may be processed
                    // under the then clause rather than having the catch clause process
                    // the status
                    let txPromise = new Promise((resolve, reject) => {
                        let handle = setTimeout(() => {
                            event_hub.disconnect();
                            resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
                        }, 3000);
                        event_hub.connect();
                        event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
                            // this is the callback for transaction event status
                            // first some clean up of event listener
                            clearTimeout(handle);
                            event_hub.unregisterTxEvent(transaction_id_string);
                            event_hub.disconnect();

                            // now let the application know what happened
                            var return_status = {event_status : code, tx_id : transaction_id_string};
                            if (code !== 'VALID') {
                                console.error('The transaction was invalid, code = ' + code);
                                resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
                            } else {
                                console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
                                resolve(return_status);
                            }
                        }, (err) => {
                            //this is the callback if something goes wrong with the event registration or processing
                            reject(new Error('There was a problem with the eventhub ::'+err));
                        });
                    });
                    promises.push(txPromise);

                    return Promise.all(promises);
                } else {
                    console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
                    throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
                }
            }).then((results) => {
                console.log('Send transaction promise and event listener promise have completed');
                // check the results in the order the promises were added to the promise all list
                if (results && results[0] && results[0].status === 'SUCCESS') {
                    console.log('Successfully sent transaction to the orderer.');
                    res.send(tx_id.getTransactionID());
                } else {
                    console.error('Failed to order the transaction. Error code: ' + response.status);
                }

                if(results && results[1] && results[1].event_status === 'VALID') {
                    console.log('Successfully committed the change to the ledger by the peer');
                    res.send(tx_id.getTransactionID());
                } else {
                    console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
                }
            }).catch((err) => {
                console.error('Failed to invoke successfully :: ' + err);
            });
        }, //

        request_access: function(req, res){
            var array = req.params.data.split("-");

            var url = array[0];
            var id = array[1];
            var org = array[2];

            var member_user = null;
            var tx_id = null;

            Fabric_Client.newDefaultKeyValueStore({ path: store_path
            }).then((state_store) => {
                // assign the store to the fabric client
                fabric_client.setStateStore(state_store);
                var crypto_suite = Fabric_Client.newCryptoSuite();
                // use the same location for the state store (where the users' certificate are kept)
                // and the crypto store (where the users' keys are kept)
                var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
                crypto_suite.setCryptoKeyStore(crypto_store);
                fabric_client.setCryptoSuite(crypto_suite);

                // get the enrolled user from persistence, this user will sign all requests
                return fabric_client.getUserContext(url, true);
            }).then((user_from_store) => {
                if (user_from_store && user_from_store.isEnrolled()) {
                    console.log('Successfully loaded user from persistence');
                    member_user = user_from_store;
                } else {
                    throw new Error('Failed to get user.... run registerUser.js');
                }

                // get a transaction id object based on the current user assigned to fabric client
                tx_id = fabric_client.newTransactionID();
                console.log("Assigning transaction_id: ", tx_id._transaction_id);


                // createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
                // changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
                // must send the proposal to endorsing peers
                var request = {
                    //targets: let default to the peer assigned to the client
                    chaincodeId: 'peoplechain',
                    fcn: "requestAccess",
                    args: [id, org],
                    txId: tx_id,
                };

                // send the transaction proposal to the peers
                return channel.sendTransactionProposal(request);
            }).then((results) => {
                var proposalResponses = results[0];
                var proposal = results[1];
                let isProposalGood = false;
                if (proposalResponses && proposalResponses[0].response &&
                    proposalResponses[0].response.status === 200) {
                        isProposalGood = true;
                        console.log('Transaction proposal was good');
                        console.log(proposalResponses[0].response.payload.toString())
                    } else {
                        console.error('Transaction proposal was bad');
                    }
                if (isProposalGood) {
                    console.log(util.format(
                        'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
                        proposalResponses[0].response.status, proposalResponses[0].response.message));

                    // build up the request for the orderer to have the transaction committed
                    var request = {
                        proposalResponses: proposalResponses,
                        proposal: proposal
                    };

                    // set the transaction listener and set a timeout of 30 sec
                    // if the transaction did not get committed within the timeout period,
                    // report a TIMEOUT status
                    var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
                    var promises = [];

                    var sendPromise = channel.sendTransaction(request);
                    promises.push(sendPromise); //we want the send transaction first, so that we know where to check status

                    // get an eventhub once the fabric client has a user assigned. The user
                    // is required bacause the event registration must be signed
                    let event_hub = fabric_client.newEventHub();
                    event_hub.setPeerAddr('grpcs://localhost:7053', {
                        pem: readCryptoFile('peer1.pem'),
                        'ssl-target-name-override': 'peer0.org1.example.com'
                    });

                    // using resolve the promise so that result status may be processed
                    // under the then clause rather than having the catch clause process
                    // the status
                    let txPromise = new Promise((resolve, reject) => {
                        let handle = setTimeout(() => {
                            event_hub.disconnect();
                            resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
                        }, 3000);
                        event_hub.connect();
                        event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
                            // this is the callback for transaction event status
                            // first some clean up of event listener
                            clearTimeout(handle);
                            event_hub.unregisterTxEvent(transaction_id_string);
                            event_hub.disconnect();

                            // now let the application know what happened
                            var return_status = {event_status : code, tx_id : transaction_id_string};
                            if (code !== 'VALID') {
                                console.error('The transaction was invalid, code = ' + code);
                                resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
                            } else {
                                console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
                                resolve(return_status);
                            }
                        }, (err) => {
                            //this is the callback if something goes wrong with the event registration or processing
                            reject(new Error('There was a problem with the eventhub ::'+err));
                        });
                    });
                    promises.push(txPromise);

                    return Promise.all(promises);
                } else {
                    console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
                    throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
                }
            }).then((results) => {
                console.log('Send transaction promise and event listener promise have completed');
                // check the results in the order the promises were added to the promise all list
                if (results && results[0] && results[0].status === 'SUCCESS') {
                    console.log('Successfully sent transaction to the orderer.');
                    res.send(tx_id.getTransactionID());
                } else {
                    console.error('Failed to order the transaction. Error code: ' + response.status);
                }

                if(results && results[1] && results[1].event_status === 'VALID') {
                    console.log('Successfully committed the change to the ledger by the peer');
                    res.send(tx_id.getTransactionID());
                } else {
                    console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
                }
            }).catch((err) => {
                console.error('Failed to invoke successfully :: ' + err);
            }); 
        }, //Next function here

        get_request_access: function(req, res) {
            var array = req.params.data.split("-");
            var user = array[0];
            var key = array[1];
            var member_user = null;
            var tx_id = null;

            Fabric_Client.newDefaultKeyValueStore({ path: store_path
            }).then((state_store) => {
              fabric_client.setStateStore(state_store);
              var crypto_suite = Fabric_Client.newCryptoSuite();
              var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
      
              crypto_suite.setCryptoKeyStore(crypto_store);
              fabric_client.setCryptoSuite(crypto_suite);
      
              return fabric_client.getUserContext(user, true);
            }).then((user_from_store) => {
              if (user_from_store && user_from_store.isEnrolled()) {
                console.log("Successfully loaded user from persistence");
                member_user = user_from_store;
              } else {
                throw new Error("Failed to get user, register user.")
              }
      
              const request = {
                chaincodeId: 'peoplechain',
                txId: tx_id,
                fcn: 'getRecordAccess',
                args: [key]
              };
      
              return channel.queryByChaincode(request);
            }).then((query_responses) => {
              console.log('Query has completed checking results');
      
              if (query_responses && query_responses.length == 1) {
                if (query_responses[0] instanceof Error) {
                  consoe.error("Error from query: ", query_responses[0]);
                } else {
                  console.log("Response is ", query_responses[0].toString());
                  res.json(JSON.parse(query_responses[0].toString()));
                }
              } else {
                console.log("No payloads were returned from the query")
              }
            }).catch((err) => {
              console.error("Failed to query successfully :: " + err);
            });
        }, //Next function here
    }
})();