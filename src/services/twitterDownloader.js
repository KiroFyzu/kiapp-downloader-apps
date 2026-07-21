const BaseDownloader = require('./BaseDownloader');

class TwitterDownloader extends BaseDownloader {
  constructor() {
    super('twitter');
  }
}

module.exports = TwitterDownloader;
