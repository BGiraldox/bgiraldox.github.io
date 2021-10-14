---
title: Designing web applications for geographical scale
date: 2016-09-11T20:00:38+02:00
author: Jan Hajek
permalink: /2016/09/11/designing-web-applications-for-geographical-scale/
categories:
  - Microsoft
  - Microsoft Azure
tags:
  - Azure SQL
  - Azure Web Apps
  - Geographical
  - Scaling
---

<p>I have been wandering around the web trying to find some more information about geographically scaling web applications with both web and database tier. With Azure, I really don’t think there’s an active issue with possible downtime but mostly the need for reaching your customers with the application all around the globe.</p>

<!--more-->

<h1>Azure App Service</h1>

<p>In addition to scaling the application horizontally and vertically (using the scale out and scale up options within the App Service plan), you can enhance the experience by delivering the static content with help of Azure CDN, however this doesn’t make your application truly geographically distributed.</p>

<p>You can leverage the geographical distribution in cases of high-availability solution or delivering the application around the globe making use of the Azure regions available to you.</p>

<p>With Azure App Service it is very simple to geographically scale your applications. You can create an App Service Plan in each region, create a Web App in each Service Plan and connect it to the Source Control (while leveraging Web Hooks for Continuous Integration), which will insure that all regions are running the latest code of your application and place a Traffic Manager in front of all the Web App instances across the regions. If you are using the Premium App Service plan, you could also use the Clone option instead.</p>
<div class="wp-block-image"><figure class="aligncenter"><a href="/uploads/2016/09/trafficmanager.png"><img src="/uploads/2016/09/trafficmanager-300x231.png" alt="Leveraging Traffic Manager with Performance routing." class="wp-image-47"/></a><figcaption>Leveraging Traffic Manager with Performance routing.</figcaption></figure></div>
<p><strong>Update (18SEP2016):</strong> Additionally, one day ago, I stumbled upon a great video explaining the whole setup for geographically scaling your application with <a href="https://channel9.msdn.com/Shows/Cloud+Cover/Episode-213-Azure-App-Service-Best-Practices-for-Large-Scale-Applications">Azure Web Apps on Channel9</a>:</p>

<p><a href="https://channel9.msdn.com/Shows/Cloud+Cover/Episode-213-Azure-App-Service-Best-Practices-for-Large-Scale-Applications">https://channel9.msdn.com/Shows/Cloud+Cover/Episode-213-Azure-App-Service-Best-Practices-for-Large-Scale-Applications</a></p>

<h1>Azure SQL</h1>

<p>So in general, Azure makes it very easy to deploy a globally available web application. Now let’s take a look at the database tier options. I am going to start with explaining Azure SQL Geo-Replication scenario.</p>

<h2>Active Geo-Replication</h2>

<p>If you opt-in to use the Active Geo-Replication, you get into a scenario with one primary (master) database and the ability of having of up to 4 read-only replicas (slaves). This allows your application to be distributed into 5 different regions, which should be more than enough in most geo-scenarios. However, for most developers, who have little to no experience with writing geographically scalable applications, this scenario can be an issue.</p>

<p>Starting with the fact that you need to separate your write and read operations – to send all write operations to the master database (which can be in different region) and making the reads from the closest available readable slave (or master). This scenario can work well for application which doesn’t perform too many write operations.</p>

<p>The first issue you are going to notice is that the replication between master and slave nodes is asynchronous, which means that whenever you perform a write operation (on the master) the result will not be visible on the slave node immediately. This can be okay if you are writing some background data which are not required to be available to the current user immediately (saving data for background job, statistics etc.), however it may become an obstacle when needing to access the data directly after the write operation. The asynchronous write operation takes from about a half second to two seconds.</p>

<p>Luckily, the wonderful Azure SQL has a solution if you need the data available for read on the slave (or all of the slaves) right after the write operation (perform a sort of synchronous write) – you can execute this system call: <strong>sp_wait_for_database_copy_sync</strong> (see an example for how to use it). This will make sure that the write operation you made is going to be finished only once it has been propagated to the specific slave database as specified.</p>

```sql
INSERT INTO table (ID, Value) VALUES (1, "VALUE");
USE database;
EXEC sys.sp_wait_for_database_copy_sync @target_server = 'server_hostname', @target_database = 'database';
```

<p>You can find out more about this in <a href="https://azure.microsoft.com/en-us/documentation/articles/sql-database-geo-replication-overview/#preventing-the-loss-of-critical-data">Azure documentation</a>.</p>
<h3>WordPress</h3>

<p>Of course you are going to ask – how can I leverage the active geo-replication within my existing application, ie. WordPress/Project Nami? In the WordPress world, there is a plugin for almost everything! You can make use of HyperDB (<a href="https://wordpress.org/plugins/hyperdb/"><u>https://wordpress.org/plugins/hyperdb/</u></a>) plugin and setup the master – slave database connections very easily!</p>

<h2>Azure SQL Data Sync</h2>

<p>In some cases, you may need to perform writes much faster and have them available immediately at the current database server and be able to take in the fact that it may take some time to have the changes propagated to other regions. This is very Azure SQL Data Sync comes in.</p>

<p>The Data Sync is a feature, which allows you to synchronize a database across servers (both cloud and on premise). This may be a better solution if you need to perform higher number of writes while having the changes available locally immediately and then being synced to other database nodes.</p>

<p>You can choose to have the database synchronization performed every 5 or more minutes, this means that the changes will be propagated after a little bit longer (compared to Active Geo-Replication method). It may probably be more suitable for application like WordPress/Project Nami (since it is usually not really super important that the post is going to be visible no sooner than after 5 minutes since the database write in all the other regions).</p>

<p>However it might be quite crucial to study the <a href="http://download.microsoft.com/download/4/E/3/4E394315-A4CB-4C59-9696-B25215A19CEF/SQL_Data_Sync_Preview.pdf">SQL Data Sync documentation</a>&nbsp; first, since it doesn’t support for example all the data types.</p>

<h1>Footnote</h1>

<p>So this was a very brief overview of what is possible with Microsoft Azure PaaS services. Scaling an application geographically with Azure App Service itself is pretty straightforward and super easy. Adding a geographically scalable database layer can make things more complex and requires a lot more planning.</p>
