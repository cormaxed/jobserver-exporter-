#!/usr/bin/env node
/* eslint-disable no-console */
const express = require('express');
const axios = require('axios');
const prom = require('prom-client');
const yargs = require('yargs');

const processedJobIds = [];

function createMetrics() {
  const successCount = new prom.Counter({
    name: 'jobserver_success_count',
    help: 'Succesfull job count',
    labelNames: ['job'],
  });
  const failCount = new prom.Counter({
    name: 'jobserver_fail_count',
    help: 'Failed job count',
    labelNames: ['job'],
  });
  const durationHistogram = new prom.Summary({
    name: 'jobserver_duration_seconds',
    help: 'Job duration in seconds',
    labelNames: ['job'],
  });
  return { successCount, durationHistogram, failCount };
}

function parseArgs() {
  return yargs
    .option('scrape_uri', {
      describe: 'URI to the Jobserver REST Api',
      default: 'http://localhost:8090',
    })
    .option('port', {
      describe: 'Port to expose metrics on',
      default: 8089,
    })
    .option('scrape_interval', {
      describe: 'Scrape frequency in seconds',
      default: 5 * 60,
    })
    .option('from_timestamp', {
      describe: 'Datetime to start collecting job metrics from. Default is now.',
      default: new Date().toISOString(),
    });
}

async function getJobs(uri) {
  const res = await axios.get(`${uri}/jobs`);
  return res.data;
}

// Setup prometheus counters
const { successCount, durationHistogram, failCount } = createMetrics();

// Parse command line arguments
const { argv } = parseArgs();

async function collectMetrics() {
  try {
    const jobs = await getJobs(argv.scrape_uri);
    const fromDate = Date.parse(argv.from_timestamp);

    jobs.filter((element) => !processedJobIds.includes(element.jobId))
      .filter((element) => Date.parse(element.startTime) > fromDate)
      .forEach((element) => {
        if (element.status === 'FINISHED') {
          successCount.inc({ job: element.classPath });
          const duration = parseFloat(element.duration.split(' ', 1));
          durationHistogram.observe({ job: element.classPath }, duration);
        } else if (element.status === 'ERROR') {
          failCount.inc({ job: element.classPath });
        }

        processedJobIds.push(element.jobId);
      });
  } catch (e) {
    console.log(e.message);
  }
}

// Schedule metric collection
collectMetrics();
setInterval(collectMetrics, argv.scrape_interval * 1000);

// Expose the metrics endpoint
const app = express();

// Export Prometheus metrics from /metrics endpoint
app.get('/metrics', (req, res) => {
  res.end(prom.register.metrics());
});

app.listen(argv.port, () => {
  console.log(`Jobserver exporter listening on ${argv.port}`);
  console.log(`Connecting to Spark jobserver on ${argv.jobserverUrl} polling every ${argv.poll} seconds`);
});
