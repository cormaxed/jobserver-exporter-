#!/usr/bin/env node
/* eslint-disable no-console */
const express = require('express');
const yargs = require('yargs');
const prom = require('prom-client');

const Jobserver = require('./jobserver');
const JobserverCollector = require('./jobserver_collector');

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

// Parse command line arguments
const { argv } = parseArgs();

const jobserver = new Jobserver(argv.scrape_uri);
const jobServerCollector = new JobserverCollector(prom, jobserver, argv.from_timestamp);

// Start scheduled metric collection
jobServerCollector.start(argv.scrape_interval * 1000);

// Expose the metrics endpoint
const app = express();

// Export Prometheus metrics from /metrics endpoint
app.get('/metrics', (req, res) => {
  res.end(prom.register.metrics());
});

app.listen(argv.port, () => {
  console.log(`Jobserver exporter listening on ${argv.port}`);
  console.log(`Connecting to Spark jobserver on ${argv.jobserverUrl} polling every ${argv.scrape_interval} seconds`);
});
