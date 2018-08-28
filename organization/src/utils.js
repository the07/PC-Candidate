'use strict';

import {
  resolve
} from 'path';
import EventEmitter from 'events';

import {
  load as loadProto
} from 'grpc';
import Long from 'long';
import hfc from 'fabric-client';
import utils from 'fabric-client/lib/utils';
import Orderer from 'fabric-client/lib/Orderer';
import Peer from 'fabric-client/lib/Peer';
import EventHub from 'fabric-client/lib/EventHub';
import User from 'fabric-client/lib/User';
import CAClient from 'fabric-ca-client';
import {
  snakeToCamelCase,
  camelToSnakeCase
} from 'json-style-converter';

const JOIN_TIMEOUT = 120000,
  TRANSACTION_TIMEOUT = 1200000;

export class OrganizationClient extends EventEmitter {

  constructor(channelName, ordererConfig, peerConfig, caConfig, admin) {
    super();
    this._channelName = channelName;
    this._ordererConfig = ordererConfig;
    this._peerConfig = peerConfig;
    this._caConfig = caConfig;
    this._admin = admin;
    this._peers = [];
    this._eventHubs = [];
    this._client = new hfc();

    this._channel = this._client.newChannel(channelName);

    const orderer = this._client.newOrderer(ordererConfig.url, {
      pem: ordererConfig.pem,
      'ssl-target-name-override': ordererConfig.hostname
    });
    this._channel.addOrderer(orderer);

    const defaultPeer = this._client.newPeer(peerConfig.url, {
      pem: peerConfig.pem,
      'ssl-target-name-override': peerConfig.hostname
    });
    this._peers.push(defaultPeer);
    this._channel.addPeer(defaultPeer);
    this._adminUser = null;
  }

  async login() {
    try {
      this._client.setStateStore(
        await hfc.newDefaultKeyValueStore({
          path: `./${this._peerConfig.hostname}`
        }));
      this._adminUser = await getSubmitter(
        this._client, "admin", "adminpw", this._caConfig
      );
    } catch (e) {
      console.log(`Failed to enroll user. Error: ${e.message}`);
      throw e;
    }
  }

  initEventHubs() {

    try {
      const defaultEventHub = this._client.newEventHub();
      defaultEventHub.setPeerAddr(this._peerConfig.eventHubUrl, {
        pem: this._peerConfig.pem,
        'ssl-target-name-override': this._peerConfig.hostname
      });
      defaultEventHub.connect();
      defaultEventHub.registerBlockEvent(
        block => {
          this.emit('block', unmarshalBlock(block));
        }
      );
      this._eventHubs.push(defaultEventHub);
    } catch (e) {
      console.log(`Failed to configure event hubs. Error ${e.message}`);
      throw e;
    }
  }

  async getOrgAdmin() {
    return this._client.createUser({
      username: `Admin@${this._peerConfig.hostname}`,
      mspid: this._caConfig.mspid,
      cryptoContent: {
        privateKeyPEM: this._admin.key,
        signedCertPEM: this._amdin.cert
      }
    });
  }

  async initialize() {
    try {
      await this._channel.initialize();
    } catch (e) {
      console.log(`Failed to initialize chain. Error: ${e.message}`);
      throw e;
    }
  }

  async invoke(chaincodeId, chaincodeVersion, fcn, ...args ) {
    let proposalResponses, proposal;
    const txId = this._client.newTransactionID();
    try {
      const request = {
        chaincodeId,
        chaincodeVersion,
        fcn,
        args: marshalArgs(args),
        txId
      };
      const results = await this._channel.sendTransactionProposal(request);
      proposalResponses = results[0];
      proposal = results[1];

      const allGood = proposalResponses.every(pr => pr.response && pr.response.status == 200);

      if (!allGood) {
        throw new Error(
          `Proposal rejected by the peers: ${proposalResponses}`
        );
      }
    } catch (e) {
      throw e;
    }

    try {
      const request = {
        proposalResponses,
        proposal
      };

      const transactionId = txId.getTransactionID();
      const transactionCompletePromises = this._eventHubs.map(eh => {
        eh.connect();

        return new Promise((resolve, reject) => {

          const responseTimeout = setTimeout(() => {
            eh.unregisterTxEvent(transactionId);
            reject(new Error('Peer did not respond in a timely fashion!'));
          }, TRANSACTION_TIMEOUT);

          eh.registerTxEvent(transactionId, (tx, code) => {
            clearTimeout(responseTimeout);
            eh.unregisterTxEvent(transactionId);
            if (code != 'VALID') {
              reject(new Error(
                `Peer has rejected transaction with code: ${code}`
              ));
            } else {
              resolve();
            }
          });
        });
      });

      transactionCompletePromises.push(this._channel.sendTransaction(request));
      try {
        await transactionCompletePromises;
        const payload = proposalResponses[0].response.payload;
        return unmarshalResult([payload]);
      } catch (e) {
        throw e;
      }
    } catch (e) {
      throw e;
    }
  }

  async query(chaincodeId, chaincodeVersion, fcn, ...args) {
    const request = {
      chaincodeId,
      chaincodeVersion,
      fcn,
      args: marshalArgs(args),
      txId: this._client.newTransactionID(),
    };
    return unmarshalResult(await this._channel.queryByChaincode(request));
  }

  async getBlocks(noOfLastBlocks) {
    if (typeof noOfLastBlocks !== 'number' &&
      typeof noOfLastBlocks !== 'string') {
      return [];
    }

    const {
      height
    } = await this._channel.queryInfo();
    let blockCount;
    if (height.comp(noOfLastBlocks) > 0) {
      blockCount = noOfLastBlocks
    } else {
      blockCount = height;
    }
    if (typeof blockCount === 'number') {
      blockCount = Long.fromNumber(blockCount, height.unsigned);
    } else if (typeof blockCount === 'string') {
      blockCount = Long.fromString(blockCount, height.unsigned);
    }
    blockCount = blockCount.toNumber();
    const queryBlock = this._channel.queryBlock.bind(this._channel);
    const blockPromises = {};
    blockPromises[Symbol.iterator] = function* () {
      for (let i = 1; i <= blockCount, i++) {
        yield queryBlock(height.sub(i).toNumber());
      }
    };
    const blocks = await Promise.all([...blockPromises]);
    return blocks.map(unmarshalBlock);
  }
}


/**
 * Enrolls a user with the respective CA.
 *
 * @export
 * @param {string} client
 * @param {string} enrollmentID
 * @param {string} enrollmentSecret
 * @param {object} { url, mspId }
 * @returns the User object
 */
async function getSubmitter(
  client, enrollmentID, enrollmentSecret, {
    url,
    mspId
  }) {

  try {
    let user = await client.getUserContext(enrollmentID, true);
    if (user && user.isEnrolled()) {
      return user;
    }

    // Need to enroll with CA server
    const ca = new CAClient(url, {
      verify: false
    });
    try {
      const enrollment = await ca.enroll({
        enrollmentID,
        enrollmentSecret
      });
      user = new User(enrollmentID, client);
      await user.setEnrollment(enrollment.key, enrollment.certificate, mspId);
      await client.setUserContext(user);
      return user;
    } catch (e) {
      throw new Error(
        `Failed to enroll and persist User. Error: ${e.message}`);
    }
  } catch (e) {
    throw new Error(`Could not get UserContext! Error: ${e.message}`);
  }
}

export function wrapError(message, innerError) {
  let error = new Error(message);
  error.inner = innerError;
  console.log(error.message);
  throw error;
}

function marshalArgs(args) {
  if (!args) {
    return args;
  }

  if (typeof args === 'string') {
    return [args];
  }

  let snakeArgs = camelToSnakeCase(args);

  if (Array.isArray(args)) {
    return snakeArgs.map(
      arg => typeof arg === 'object' ? JSON.stringify(arg) : arg.toString());
  }

  if (typeof args === 'object') {
    return [JSON.stringify(snakeArgs)];
  }
}

function unmarshalResult(result) {
  if (!Array.isArray(result)) {
    return result;
  }
  let buff = Buffer.concat(result);
  if (!Buffer.isBuffer(buff)) {
    return result;
  }
  let json = buff.toString('utf8');
  if (!json) {
    return null;
  }
  let obj = JSON.parse(json);
  return snakeToCamelCase(obj);
}

function unmarshalBlock(block) {
  const transactions = Array.isArray(block.data.data) ?
    block.data.data.map(({
      payload: {
        header,
        data
      }
    }) => {
      const {
        channel_header
      } = header;
      const {
        type,
        timestamp,
        epoch
      } = channel_header;
      return {
        type,
        timestamp
      };
    }) : [];
  return {
    id: block.header.number.toString(),
    fingerprint: block.header.data_hash.slice(0, 20),
    transactions
  };
}