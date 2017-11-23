// node
const stream = require('stream');

// npm
const uuidv4 = require('uuid/v4');
const SQS = require('aws-sdk').SQS;
const Joi = require('joi');
const _ = require('lodash');

// setup
const defaultOptions = {
  batchSize: 10,
  config: {}
};

/**
 * Extends the nodejs writable stream API for sending messages to SQS
 */
class SqsWriteStream extends stream.Writable {
  /**
   * Must provide queueName or queueUrl
   * @param {Object} queue - An object with either the QueueUrl or QueueName
   * @param {Object} [options]
   * @param {Object} [options.batchSize = 10]
   * @param {Object} [options.MessageGroupId]
   * @param {Object} [options.config = {}]
   */
  constructor(queue, options) {
    super({ objectMode: true });

    // validation
    Joi.assert(queue, Joi.object({
      url: Joi.string().min(1),
      name: Joi.string().min(1)
    }).required());
    Joi.assert(options, Joi.object());

    this.options = _.defaultsDeep(options, defaultOptions);
    this.sqs = new SQS(this.options.config);
    this.buffer = [];
    this.queueName = queue.name;
    this.queueUrl = queue.url;

    this.emit('streamConstructed', queue, options);
  }


  async getQueueUrl() {
    const params = {
      QueueName: this.queueName
    };
    this.queueUrl = await this.sqs.getQueueUrl(params).promise();
  };

  async _write(obj, enc, cb) {
    this.emit('msgReceived', obj);
    try {
      if (!this.queueUrl) {
        await this.getQueueUrl();
      }
      if (this.buffer.length === this.options.batchSize) {
        await this.sqs.sendMessageBatch({ Entries: this.buffer, QueueUrl: this.queueUrl }).promise();
      } else {
        const sqsMsg = _.clone(obj);
        if (obj.Id && obj.MessageBody) {
          this.buffer.push(sqsMsg);
        } else {
          const msg = { MessageBody: JSON.stringify(obj), Id: uuidv4() };
          if (this.options.MessageGroupId) {
            msg.MessageGroupId = this.options.MessageGroupId;
          }
          this.buffer.push(msg);
        }
      }

      this.emit('msgProcessed', obj);
      return cb();
    } catch (err) {
      this.emit('msgProcessingErr', obj, err);
      return cb(err);
    }
  }

  async _final(cb) {
    try {
      if (this.buffer.length > 0) {
        await this.sqs.sendMessageBatch({ Entries: this.buffer, QueueUrl: this.queueUrl }).promise();
      }

      return cb();
    } catch (err) {
      this.emit('streamFinishingErr', err);
      return cb(err);
    }
  }
}

module.exports = SqsWriteStream;
