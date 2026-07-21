const BaseDownloader = require('./BaseDownloader');

class YoutubeDownloader extends BaseDownloader {
  constructor() {
    super('youtube');
  }
}

module.exports = YoutubeDownloader;
