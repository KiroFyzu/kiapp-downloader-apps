const BaseDownloader = require('./BaseDownloader');

class FacebookDownloader extends BaseDownloader {
  constructor() {
    super('facebook');
  }
}

module.exports = FacebookDownloader;
