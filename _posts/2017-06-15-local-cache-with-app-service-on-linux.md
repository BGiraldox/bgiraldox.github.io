---
title: Local Cache with App Service on Linux
date: 2017-06-15T09:00:42+02:00
author: Jan Hajek
permalink: /2017/06/15/local-cache-with-app-service-on-linux/
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - App Service on Linux
  - Docker
  - Local Cache
---

<p>I am sure you have heard of App Service's feature called <a href="https://hajekj.net/2016/11/14/speed-up-your-application-in-azure-app-service/">Local Cache</a>, which allows to cache all the files locally on the instance instead of pulling them from the shared storage which can lower the application's load times - especially when using <a href="https://en.wikipedia.org/wiki/Just-in-time_compilation">just-in-time</a> compiled code like PHP. This great feature however, is only available currently on App Service on Windows, and in this article, we are going to explore the options of having something similar on App Service on Linux powered by Docker.</p>

<!--more-->

<p>Since App Service on Linux gives you a lot of freedom with regards to your runtime environment, there is probably not going to be an official alternative anytime soon provided by Microsoft. However, when coming to think about it - there are two options which can get us there:</p>

<h1>Local Cache directly in the Docker container</h1>

<p>First off, we are going to explore the harder but more obvious option - handling the Local Cache directly within the Docker image. That of course requires you to know <a href="https://hajekj.net/2016/12/25/building-custom-docker-images-for-use-in-app-service-on-linux/">how to make such an image</a>.</p>

<p>With that knowledge, you could simply build the image directly with the source code embedded into the container and ship the code with the container. That is the most usual approach, however, what if you want to be able to use FTP, Git publishing or CI without having the rebuild the image all over again? You would go and take the runtime image approach. With that, the process requires a very simple change in your Docker image:</p>

<p>All you have to do is to add a command to the <a href="https://github.com/TheNetworg/appsvc-hhvm/blob/master/Dockerfile#L7">Dockerfile's</a>&nbsp;<a href="https://github.com/TheNetworg/appsvc-hhvm/blob/master/init_container.sh">startup script</a> which will copy the entire content of&nbsp;<em>/home/site/wwwroot/</em> to the destination folder which is located within the image itself. The command to copy the content could look like this:</p>

```bash
cp -R /home/site/wwwroot/* /var/www/html/ # replace /var/www/html with your local folder
```


<p>Just like with App Service on Windows, whenever you change the content of your&nbsp;shared storage, you will have to restart the containers in order for them to fetch the new content. Such action can be very easily hooked into your Continuous Delivery process with Visual Studio Team Services for example.</p>

<p>When speaking of restarts, it is good to note that App Service on Linux uses overlapped recycling which means that when you restart the App Service, the orchestrator on the background is going to wait before killing the previous container until a new one is up and running which can minimize the downtime a lot.</p>

<h1>Local Cache using startup file</h1>

<p>Initially, I was expecting this to be a much more simple process however I ran into some issues and I wouldn't recommend this approach to be used in production.</p>

<p>When choosing a Docker container for your App Service on Linux site, you can also specify the Startup file which will get executed upon the container's start. It seems to be the equivalent to adding the <a href="https://docs.docker.com/engine/reference/run/#cmd-default-command-or-options"><em>COMMAND</em></a> argument when using&nbsp;<em>docker run</em>. That has generally two implications:</p>

<p>It allows you to leverage local cache and eventually perform other container modifications without modifying the image itself which gives you the opportunity to do a lot of things with the container without the knowledge of its Dockerfile and having to rebuild it (you shouldn't be doing this without knowing everything it is going to affect tho and should generally avoid this method). However it also overrites the&nbsp;<a href="https://github.com/TheNetworg/appsvc-hhvm/blob/master/Dockerfile#L17"><em>CMD</em> specified within the Dockerfile itself</a> which will in most of the cases break the Docker image.</p>

<p>The way to solve this, is to create your custom startup script, for example&nbsp;<em>start.sh</em> and place it into&nbsp;the persistent file system (so either upload it through FTP or push it to your Git repo) for example to application's&nbsp;<em>/home/site</em><em>/</em> directory. The contents of the script have to include at least following:</p>

```bash
#!/bin/bash
mkdir /var/www
cp -R /home/site/wwwroot/* /var/www/
exec /bin/init_container.sh # or any other command that you overwrote from the Dockerfile with your custom script
```

<p>In first place, we create the folder with the local content - this could be already done in your image (for Apache it would be&nbsp;<em>/var/www/html/</em>), then copy the contents of the persistent file system, just like you would do in a custom Docker container and then, you would call the Docker's original&nbsp;<em>CMD</em> (or eventually include the contents of the original script directly) just to make sure that the container gets instantied correctly (so in the case of <a href="https://hajekj.net/2016/12/25/building-custom-docker-images-for-use-in-app-service-on-linux/">HHVM container</a> - <em>sshd</em> service gets started and HHVM web server is started too).</p>

<p>After you have the script set, you then need to set it as a startup command to execute your script so for example&nbsp;<em>/home/site/start.sh</em>.</p>

<h1>Summary</h1>

<p>These are the two possibilities to create a Local Cache equivalent in <a href="https://docs.microsoft.com/en-us/azure/app-service/app-service-linux-readme">App Service on Linux</a>, however if you are trying to go for a Local Cache, you should definitely take the direct container approach which makes it easier and more straightforward. The second option - overriding the container's startup command/script is rather an antipattern and you should avoid it.</p>
<blockquote class="wp-block-quote"><p>Also, thanks to Nick Walker (<a href="https://twitter.com/nickwalkmsft">@nickwalkmsft</a>) for helping out with couple of issues I ran into while exploring the second option of creating a Local Cache by overriding the startup command!</p></blockquote>
<!-- /wp:quote -->