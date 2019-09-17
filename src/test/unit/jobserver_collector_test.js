const assert = require('assert');
const prom = require('prom-client');
const {
  describe, it, beforeEach, afterEach,
} = require('mocha');
const sinon = require('sinon');

const JobServer = require('../../jobserver');
const JobServerCollector = require('../../jobserver_collector');

function getValueForCounter(counter, label) {
  const counterValues = counter.get().values;
  return counterValues.filter((t) => t.labels.job === label)[0].value;
}

function getValueForMetric(histogram, metric, label) {
  const metricsLabel = histogram.get().values
    .filter((t) => t.metricName === metric && t.labels.job === label);
  return metricsLabel[0].value;
}

describe('JobServerCollector', () => {
  let jobServer;
  let jobServerCollector;

  beforeEach(() => {
    jobServer = new JobServer();
    jobServerCollector = new JobServerCollector(prom, jobServer,
      new Date(Date.now() - 1000).toISOString());
  });

  afterEach(() => {
    jobServer.getJobs.restore(); // Unwraps the spy
    prom.register.clear();
  });

  describe('#collectMetrics()', () => {
    const myJob = 'org.myorg.MyJob';
    const myOtherJob = 'org.myorg.MyOtherJob';

    it('should ignore ERRORS from durations and RUNNING from counts and durations', async () => {
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
        context: 'da403afcorg.myorg.MyContext',
        status: 'FINISHED',
        jobId: '30495825-36cd-46a3-b85d-39700ea775a3',
      }, {
        duration: '1000 secs',
        classPath: 'org.myorg.MyJob',
        startTime: new Date().toISOString(),
        context: 'da403afc-org.myorg.MyContext',
        status: 'ERROR',
        jobId: 'e98b0e1d-9bd0-432f-b7e8-8efdfbb8857a',
      }, {
        duration: '1000 secs',
        classPath: 'org.myorg.MyJob',
        startTime: new Date().toISOString(),
        context: 'da403afc-org.myorg.MyContext',
        status: 'RUNNING',
        jobId: '522b1e25-2e72-4c4e-ac04-7dcbb4b0795c',
      }, {
        duration: '10000 secs',
        classPath: 'org.myorg.MyJob',
        startTime: '2019-08-10T19:00:05.941Z',
        context: 'da403afc-org.myorg.MyContext',
        status: 'RUNNING',
        jobId: '937a189e-d546-45a5-b07f-bc5400623702',
      }]);

      await jobServerCollector.collectMetrics();

      assert.equal(getValueForCounter(jobServerCollector.successCount, myJob), 2);
      assert.equal(getValueForCounter(jobServerCollector.failCount, myJob), 1);

      assert.equal(getValueForMetric(jobServerCollector.durationHistogram, 'jobserver_duration_seconds_sum', myJob), 300);
      assert.equal(getValueForMetric(jobServerCollector.durationHistogram, 'jobserver_duration_seconds_count', myJob), 2);
    });

    it('should store seperate counts using job classPath', async () => {
      sinon.stub(jobServer, 'getJobs').callsFake(() => [{
        duration: '10 secs',
        classPath: 'org.myorg.MyJob',
        startTime: new Date().toISOString(),
        context: 'd0177084-org.myorg.MyContext',
        status: 'FINISHED',
        jobId: 'f9268dc5-c9ef-4d82-b946-28bc513ab277',
      }, {
        duration: '100 secs',
        classPath: 'org.myorg.MyOtherJob',
        startTime: new Date().toISOString(),
        context: 'da403afc-org.myorg.MyContext',
        status: 'FINISHED',
        jobId: '30495825-36cd-46a3-b85d-39700ea775a3',
      }, {
        duration: '1 secs',
        classPath: 'org.myorg.MyJob',
        startTime: new Date().toISOString(),
        context: 'da403afc-org.myorg.MyContext',
        status: 'ERROR',
        jobId: 'e98b0e1d-9bd0-432f-b7e8-8efdfbb8857a',
      }, {
        duration: '1 secs',
        classPath: 'org.myorg.MyOtherJob',
        startTime: new Date().toISOString(),
        context: 'd0177084-org.myorg.MyContext',
        status: 'ERROR',
        jobId: '522b1e25-2e72-4c4e-ac04-7dcbb4b0795c',
      }]);

      await jobServerCollector.collectMetrics();

      assert.equal(getValueForCounter(jobServerCollector.successCount, myJob), 1);
      assert.equal(getValueForCounter(jobServerCollector.successCount, myOtherJob), 1);

      assert.equal(getValueForCounter(jobServerCollector.failCount, myJob), 1);
      assert.equal(getValueForCounter(jobServerCollector.failCount, myOtherJob), 1);

      assert.equal(getValueForMetric(jobServerCollector.durationHistogram, 'jobserver_duration_seconds_sum', myJob), 10);
      assert.equal(getValueForMetric(jobServerCollector.durationHistogram, 'jobserver_duration_seconds_count', myJob), 1);

      assert.equal(getValueForMetric(jobServerCollector.durationHistogram, 'jobserver_duration_seconds_sum', myOtherJob), 100);
      assert.equal(getValueForMetric(jobServerCollector.durationHistogram, 'jobserver_duration_seconds_count', myOtherJob), 1);
    });
  });
});
