const axios = require('axios');

module.exports = class JobServer {
  constructor(uri) {
    this.uri = uri;
  }

  async getJobs() {
    const res = await axios.get(`${this.uri}/jobs`);
    return res.data;
  }
};
