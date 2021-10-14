---
title: Hosting small sites in Microsoft Azure
date: 2018-07-02T09:00:26+02:00
author: Jan Hajek
permalink: /2018/07/02/hosting-small-sites-in-microsoft-azure/
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - Containers
  - Docker
  - Linux
  - PHP
  - Shared Hosting
  - Virtual Machines
---
I have been running this blog and bunch of other projects on a local shared hosting called <a href="https://wedos.cz">WEDOS</a> for something over 3 years. They offer some great services for real good price, however after couple of issues and temptation I decided to move away to an Azure VM. We are going to take a look at how I did the move and what technologies I am using the background.

<!--more-->

Throughout the time, I went through multiple shared hosting companies (some local ones - <a href="https://www.c4.cz">C4</a>, <a href="https://www.wedos.cz">WEDOS</a>, some foreign ones - <a href="https://www.mediatemple.net">Media Temple</a>, <a href="https://www.godaddy.com">GoDaddy</a>, and bunch of others). With some, I have had a really great experience while with others it was not so good (I was evicted by one of the hosts because my site was crashing - yes, crashing - their servers due to load). I mostly just wanted to write code and ignore the rest while keeping the price as low as possible.

After some time of trying to choose a decent host, I decided to move my code to Azure in 2013/2014. It was really great and I have been using it until 2015 when I decided that the code I was running there became cost inefficient and ended up moving to WEDOS. I was really happy with their services initially, until for the past year, they have had some hiccups with CloudFlare - basically I could reach CloudFlare's servers but the communication between CloudFlare and WEDOS didn't work. Their support was unable to troubleshoot the issue and was just blaming CloudFlare (some other people around me were having the same issue with their site and this was ongoing for few months).

After that, I decided to start looking for a change. I started looking at other hostings like <a href="https://nearlyfreespeech.net">NearlyFreeSpeech.NET</a>, <a href="https://www.snackhost.com">SnackHost</a> and others but I just couldn't choose. I wanted something at least a little managed with freedom of Azure App Service. I ended up deciding to go with a Virtual Machine which would host Docker containers with applications. The reasons were quite obvious - I no longer develop PHP only, so any basic hosting will not accomodate my needs and in addition, when paying for the services I wanted to use them for other things like hosting a personal VPN, running some .NET Core or whatever else might come.

I decided to go with using Nginx as the reverse proxy solution which would handle SSL (<a href="https://letsencrypt.org/">Let's Encrypt</a>) and its termination and passing the request to the application container. This basically allows me to run anything with least effort.
<h1>Building the runtime container</h1>
Being used to Azure App Service (which I am in love with), I wanted to make the hosting as close to App Service on Linux as possible. I decided to base my PHP container on one of their <a href="https://github.com/Azure-App-Service/php/blob/master/7.2.5-apache/Dockerfile">images</a>. I decided to keep the folder structure the same as well, so each container has <em>/home/</em> folder mounted with the same structure.

I also added some other features into the image (like original IP address and protocol restore from the reverse proxy) which are <a href="https://github.com/Azure-App-Service/php/issues/28">missing in Microsoft's images</a>.

My custom PHP runtime container is opensource and available on both <a href="https://github.com/hajekj/hajekjnet-php">GitHub</a> and <a href="https://hub.docker.com/r/hajekj/hajekjnet-php/">Docker Hub</a> (I suggest forking your own if you decide to use it).
<h1>Choosing the host and VM</h1>
Since I chose to go with a Virtual Machine, choosing a host was the next obvious thing. I looked at bunch of offerings like <a href="https://ovh.net">OVH</a>, <a href="https://aws.amazon.com">AWS</a>, <a href="https://digitalocean.com">Digital Ocean</a>, of course <a href="https://azure.com">Microsoft Azure</a> and bunch of others.

Having somewhat experience with the "cheap" VPS hosts, I decided to look for a rather more proven hosting. Being a big fan of Azure and having the most experience with it since we use it on a daily basis at work, the choice was obvious. It was still nice knowing what the "competition" has to offer.

As we all know, Azure isn't the cheapest hosting provider, but in my opinion, it offers great flexibility and gives me a lot of familiar features. I decided to start with the <a href="https://azure.microsoft.com/en-us/blog/introducing-b-series-our-new-burstable-vm-size/">B-series instances</a> which are currently the cheapest ones available in Azure. From all the Linux distributions in the world, I am most familiar with Ubuntu so it was another obvious choice for me.
<h1>Putting it all together</h1>
After getting the VM up and running with backups enabled, I installed 3 packages - Docker, Certbot and Nginx. Then I took the built container for a spin - first I moved this website - because testing in production is just a great idea. I moved over all the files (having SSH access is really great since you can do things much faster than with plain FTP access) and imported the database. Then I just switched the DNS - super easy with CloudFlare and was good to go. Suddenly (I had really low expectations) the site loaded - quite fast!

After initial day of runtime and log analysis, I decided to proceed with moving the rest of the workload from the previous host. After further functional tests - nothing broke, data is accessible etc. it was all done.
<p style="text-align: center;"><a href="/uploads/2018/06/vsts_loadtest_hajekjnet.png"><img class="aligncenter size-medium wp-image-672" src="/uploads/2018/06/vsts_loadtest_hajekjnet-300x53.png" alt="" width="300" height="53" /></a><em>Load testing from VSTS, the errors are related to the load testing agent.</em></p>
Coming to think about it, I should've tried the same load test on the server on the old hosting and see what it would behave like. Either way, I would say that these are some impressive numbers anyways.
<h1>The end result</h1>
In less than a day I managed to build a sort of (very rough) App Service on Linux replica within a single virtual machine while maintaining low hosting costs and giving me much more freedom in what I can do there.

An obvious point to make - shared hosts give you bunch of other features like hosted e-mail for example - have you got any solution for that? Yes. I initially experimented (about half a year ago) with running my own e-mail server on Linux as well, but I didn't really like the way it was all set up - mostly I wanted to have <a href="http://www.openspf.org/SRS">SRS</a> working but it didn't work the way I would expect. So how do I handle e-mail? Currently, I downgraded my hosting plan to $1 month which offers just enough e-mail services (both inbound - IMAP and outbound - SMTP) so I can easily connect to those servers from my VM and send e-mails from WordPress or other service. And of course - if you need a decent mail solution - you should go with Office 365, and for applications you should go with some transactional mail service. But again, this is rather a personal server, not a business hosting so I am all good with this.
<h1>The future</h1>
And what's next? I started working on a container which would use PHP through FPM rather than the Apache 2.0 Handler which makes the Docker image slightly more memory efficient and also speeds up the requests (because it doesn't spawn PHP process for each request). I am also going to look into configuring SFTP access for foreign users - so I am able to give access to few more people to host their own things as well there and probably revisit the e-mail server idea. I am probably going to keep all the documentation (which is mainly for me anyways) in the GitHub repo - either README or Wiki, so if you interested, keep watching it.

All in all, I really enjoyed doing this not just because I now have a full featured server running somewhere in the cloud, but also because I have gained some more experience with both Linux and Docker which is very useful.