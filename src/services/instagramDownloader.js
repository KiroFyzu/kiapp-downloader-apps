const BaseDownloader = require('./BaseDownloader');

class InstagramDownloader extends BaseDownloader {
  constructor() {
    super('instagram');
  }
}

module.exports = InstagramDownloader;
