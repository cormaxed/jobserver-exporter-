# Prometheus Exporter For Apache Spark Jobserver

Provides an endpoint to expose Jobserver metrics to Prometheus.

Help on flags:

```
Options:
  --help             Show help                                         [boolean]
  --version          Show version number                               [boolean]
  --scrape_uri       URI to the Jobserver REST Api
                                              [default: "http://localhost:8090"]
  --port             Port to expose metrics on                   [default: 8089]
  --scrape_interval  Scrape frequency in seconds                  [default: 300]
  --from_timestamp   Datetime to start collecting job metrics from. Default is
                     now.                  [default: "2019-09-05T23:11:18.017Z"]
```

Installing:

```
npm i -g
```

Running:

```
spark-jobserver-exporter --scrape_uri=http://myjobserver:8090
```


# Collectors

```
# HELP jobserver_success_count Succesfull job count
# TYPE jobserver_success_count counter
jobserver_success_count{job="org.myorg.MyJob"} 34

# HELP jobserver_fail_count Failed job count
# TYPE jobserver_fail_count counter
jobserver_fail_count{job="org.myorg.MyJob"} 16

# HELP jobserver_duration_seconds Job duration in seconds
# TYPE jobserver_duration_seconds summary
jobserver_duration_seconds{quantile="0.01",job="org.myorg.MyJob"} 946.049
jobserver_duration_seconds{quantile="0.05",job="org.myorg.MyJob"} 959.5509999999999
jobserver_duration_seconds{quantile="0.5",job="org.myorg.MyJob"} 1168.248
jobserver_duration_seconds{quantile="0.9",job="org.myorg.MyJob"} 2378.643800000001
jobserver_duration_seconds{quantile="0.95",job="org.myorg.MyJob"} 3015.8142
jobserver_duration_seconds{quantile="0.99",job="org.myorg.MyJob"} 3054.911
jobserver_duration_seconds{quantile="0.999",job="org.myorg.MyJob"} 3054.911
jobserver_duration_seconds_sum{job="org.myorg.MyJob"} 46294.48900000001
jobserver_duration_seconds_count{job="org.myorg.MyJob"} 34
```
