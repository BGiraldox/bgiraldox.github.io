---
title: Dynamic Cache in App Service
date: 2019-03-04T09:00:16+01:00
author: Jan Hajek
permalink: /2019/03/04/dynamic-cache-in-app-service/
categories:
  - Microsoft
  - Microsoft Azure
tags:
  - Azure Web Apps
  - Dynamic Cache
  - Local Cache
  - Performance
---

<p>A while ago, while I was browsing <a href="https://github.com/projectkudu/kudu/wiki/Configurable-settings">Kudu's setting documentation</a> I stumbled upon a setting that caught my eye - Dynamic Cache. I have never heard or read about it in Microsoft's own documention (except that page on GitHub) so I decided to try it out.</p>

<!--more-->

<p>The initial problem with App Service is its slow filesystem (<a href="https://hajekj.net/2016/11/14/speed-up-your-application-in-azure-app-service/">which I have blogged about already</a> more than <a href="https://hajekj.net/2017/06/15/local-cache-with-app-service-on-linux/">once</a>). Up until this discovery you had two options - either have all the files delivered through the slow replicated filesystem or enable <a href="https://docs.microsoft.com/en-us/azure/app-service/overview-local-cache">Local Cache</a> which results in the files written locally no longer being persistent which is a major issue with most PHP applications (even for full WordPress functionality - installing plugins, updates, etc.). Now, there is a third option, which is called <a href="https://github.com/projectkudu/kudu/wiki/Configurable-settings#turning-on-the-dynamic-cache-feature">Dynamic Cache</a>. As per the documentation, it is available in two modes (copied from docs):</p>

<p><strong>Full content caching</strong>: caches both file content and directory/file metadata (timestamps, size, directory content):</p>
<pre class="wp-block-code"><code>WEBSITE_DYNAMIC_CACHE=1</code></pre>
<p><strong>Directory metadata caching</strong>: will not cache content of the files, only the directory/file metadata (timestamps, size, directory content). That results in much less local disk use:</p>
<pre class="wp-block-code"><code>WEBSITE_DYNAMIC_CACHE=2</code></pre>
<p>In other words, it appears that Dynamic Cache is a cache at the read layer, which boosts the read operations and write operations are unaffected, this going still through the network. Now knowing this, time to test the performance of these settings!</p>

<p>For the purpose of this test, I will be using a simple PHP script to read from the filesystem (1oo times 1000 <em><a href="http://php.net/manual/en/function.file-get-contents.php">file_get_contents</a></em> operations). The site along with the storage has been hit for multiple times before the actual test (so that the cache - if used - could build and initialize properly).</p>

```php
<?php
echo "<h1>Performance Result</h1>";
$websiteDynamicCache = $_SERVER["WEBSITE_DYNAMIC_CACHE"];
echo "<b>WEBSITE_DYNAMIC_CACHE=$websiteDynamicCache</b>";

$averages = [];
for($j = 0; $j < 10; $j++) {
    $startTime = microtime(true);
    for($i = 0; $i < 1000; $i++){
        // file_put_contents("sampledata/$i.txt", "test$i");
        file_get_contents("sampledata/$i.txt");
    }
    $timeEnd = microtime(true);
    $timeResult = $timeEnd - $startTime;
    $averages[] = $timeResult;
}

$average = array_sum($averages) / count($averages);
$min = min($averages);
$max = max($averages);
echo "<br>Average: $average";
echo "<br>Minimum: $min";
echo "<br>Maximum: $max";
```

<p>Starting with the default App Service settings - Dynamic Cache is disabled.</p>

<p><strong>WEBSITE_DYNAMIC_CACHE=0</strong><br>Average: <strong>6.2657294273376</strong><br>Minimum: 4.5602788925171<br>Maximum: 10.892529010773 </p>

<p>This is actually quite high score, it took 6.3 seconds on average to read 1000 files from the filesystem! This is the original and default behavior of App Service, so you are likely to get these times everywhere. After running this multiple times, the times really vary (I chose the best run) all the way up to 26 seconds. This is obviously caused by the network latency - every request has to go to the storage worker and Azure Blob Storage on the background which can be time expensive.</p>

<p>Next, we are going with Dynamic Cache enabled set to mode 2 - caching everything except file contents, which means, that there are still reads happening over the network, however, file metadata, stamps etc. are all cached locally.</p>

<p><strong>WEBSITE_DYNAMIC_CACHE=2</strong><br>Average: <strong>2.2721150946617</strong><br>Minimum: 2.114581823349<br>Maximum: 3.6030380725861 </p>

<p>You can obviously see the difference here. We have got 2.1 times better performance on average than with using the network storage, this is great improvement!</p>

<p>Last experiment to try is with Dynamic Cache enabled in contents caching mode.</p>

<p><strong>WEBSITE_DYNAMIC_CACHE=1</strong><br>Average: <strong>0.61150848388672</strong><br>Minimum: 0.5042462348938<br>Maximum: 0.85975289344788 </p>

<p>Wow! We have got over 10 times better performance than with networked calls! The obvious question that comes to my mind is - why isn't the Dynamic Cache on by default?</p>

<p>It appears that since the early mentions (from 2017), Dynamic Cache can <a href="https://blogs.msdn.microsoft.com/waws/2017/08/02/asp-net-and-asp-net-core-application-restarts-on-azure-app-service/">cause some trouble with specific applications</a> running on App Service. Those applications also include <a href="https://www.obungi.com/2017/06/07/cake-php-and-azure-app-service-http-500-errors/">PHP apps</a>. However, having this enabled on a production WordPress site for over a month, we didn't notice any errors, but the performance has much improved since!</p>

<p>So are there any trade offs? Obviously, yes. Since files are cached for reads on the instances, they don't get refreshed the second you change them across all instances in the App Service Plan. From my tests, it usually took around 10 seconds for the change to be propagated to the end node - if you are using a single node App Service Plan, you should be fine, except the changes from Kudu site to your web site take 10 seconds as well. It appears that the Kudu site is hooked to the storage directly just like with Local Cache.</p>

<p>It is quite interesting that this feature is not mentioned in Microsoft's documentation, since it appears to have a really positive impact on the site performance. I found mentions of this feature <a href="https://blogs.msdn.microsoft.com/waws/2017/08/02/asp-net-and-asp-net-core-application-restarts-on-azure-app-service/">as early as in 2017</a>, which means it has been around for a while.</p>

<p>So if you are experiencing performance issues on App Service on Windows, I encourage you to <a href="https://github.com/projectkudu/kudu/wiki/Configurable-settings#turning-on-the-dynamic-cache-feature">go ahead and try the Dynamic Cache</a> and see if it helps you app. However, keep on mind, that since this feature is not mentioned anywhere in <a href="https://docs.microsoft.com/en-us/azure/app-service/">Microsoft's docs</a> it may not even be fully supported from Microsoft's side.</p>
