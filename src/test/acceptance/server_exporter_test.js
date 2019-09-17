const express = require('express');
const prom = require('prom-client');

const assert = require('assert');
const {
  describe, it, before, after,
} = require('mocha');
const sinon = require('sinon');
const chai = require('chai');

const { expect } = chai;
chai.use(require('chai-http'));

const app = express();
const listenPort = 8888;
const JobServer = require('../../jobserver');
const JobServerCollector = require('../../jobserver_collector');

describe('ServerExporterIT', () => {
  let jobServerCollector;
  let httpServer;
  let jobServer;

  before(() => {
    jobServer = new JobServer();
    jobServerCollector = new JobServerCollector(prom, jobServer,
      new Date(Date.now() - 1000).toISOString());

    app.get('/metrics', (req, res) => {
      res.end(prom.register.metrics());
    });

    httpServer = app.listen(listenPort, () => {
    });
  });

  after(async () => {
    prom.register.clear();
    httpServer.close();
  });

  describe('GET /metrics', async () => {
    it('should return metrics with GET /metrics', async () => {
      sinon.stub(jobServer, 'getJobs').callsFake(() => [{
        duration: '100 secs',
        classPath: 'org.myorg.MyJob',
        startTime: new Date().toISOString(),
        context: 'd0177084-org.myorg.MyContext',
        status: 'FINISHED',
        jobId: 'f9268dc5-c9ef-4d82-b946-28bc513ab277',
      }, {
        duration: '200 secs',
        classPath: 'org.myorg.MyJob',
        startTime: new Date().toISOString(),
        context: 'da403afc-org.myorg.MyContext',
        status: 'FINISHED',
        jobId: '30495825-36cd-46a3-b85d-39700ea775a3',
      }, {
        duration: '1000 secs',
        classPath: 'org.myorg.MyJob',
        startTime: new Date().toISOString(),
        context: 'da403afc-org.myorg.MyContext',
        status: 'ERROR',
        jobId: 'e98b0e1d-9bd0-432f-b7e8-8efdfbb8857a',
      }]);

      await jobServerCollector.collectMetrics();

      const expectedResponse = [
        '# HELP jobserver_success_count Succesfull job count',
        '# TYPE jobserver_success_count counter',
        'jobserver_success_count{job="org.myorg.MyJob"} 2',
        '',
        '# HELP jobserver_fail_count Failed job count',
        '# TYPE jobserver_fail_count counter',
        'jobserver_fail_count{job="org.myorg.MyJob"} 1',
        '',
        '# HELP jobserver_duration_seconds Job duration in seconds',
        '# TYPE jobserver_duration_seconds summary',
        'jobserver_duration_seconds{quantile="0.01",job="org.myorg.MyJob"} 100',
        'jobserver_duration_seconds{quantile="0.05",job="org.myorg.MyJob"} 100',
        'jobserver_duration_seconds{quantile="0.5",job="org.myorg.MyJob"} 150',
        'jobserver_duration_seconds{quantile="0.9",job="org.myorg.MyJob"} 200',
        'jobserver_duration_seconds{quantile="0.95",job="org.myorg.MyJob"} 200',
        'jobserver_duration_seconds{quantile="0.99",job="org.myorg.MyJob"} 200',
        'jobserver_duration_seconds{quantile="0.999",job="org.myorg.MyJob"} 200',
        'jobserver_duration_seconds_sum{job="org.myorg.MyJob"} 300',
        'jobserver_duration_seconds_count{job="org.myorg.MyJob"} 2',
        '',
      ].join('\n');

      chai.request(`http://localhost:${listenPort}`)
        .get('/metrics')
        .end((err, res) => {
          expect(res).to.have.status(200);
          assert.equal(res.text, expectedResponse);
        });
    });
  });
});
