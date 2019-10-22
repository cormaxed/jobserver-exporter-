
module.exports = class JobServerCollector {
  constructor(prom, jobserver, fromTimestamp) {
    this.jobserver = jobserver;
    this.fromTimestamp = Date.parse(fromTimestamp);

    this.successCount = new prom.Counter({
      name: 'jobserver_success_count',
      help: 'Succesfull job count',
      labelNames: ['job'],
    });
    this.failCount = new prom.Counter({
      name: 'jobserver_fail_count',
      help: 'Failed job count',
      labelNames: ['job'],
    });
    this.durationHistogram = new prom.Summary({
      name: 'jobserver_duration_seconds',
      help: 'Job duration in seconds',
      labelNames: ['job'],
    });

    this.processedJobIds = [];
  }

  async start(scrapeIntervalMs) {
    await this.collectMetrics();
    setInterval(() => this.collectMetrics(), scrapeIntervalMs);
  }

  async collectMetrics() {
    try {
      const jobs = await this.jobserver.getJobs();

      jobs.filter((element) => !this.processedJobIds.includes(element.jobId))
        .filter((element) => Date.parse(element.startTime) > this.fromTimestamp)
        .forEach((element) => {
          if (element.status === 'FINISHED') {
            this.successCount.inc({ job: element.classPath });
            const duration = parseFloat(element.duration.split(' ', 1));
            this.durationHistogram.observe({ job: element.classPath }, duration);
          } else if (element.status === 'ERROR') {
            this.failCount.inc({ job: element.classPath });
          }

          this.processedJobIds.push(element.jobId);
        });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e.message);
    }
  }
};
