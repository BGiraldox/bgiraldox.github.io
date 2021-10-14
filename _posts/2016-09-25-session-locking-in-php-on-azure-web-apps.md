---
title: Session locking in PHP on Azure Web Apps
date: 2016-09-25T12:00:14+02:00
author: Jan Hajek
permalink: /2016/09/25/session-locking-in-php-on-azure-web-apps/
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - Azure Web Apps
  - PHP
  - Sessions
---
During the last couple of weeks, users started noticing certain issues with an application that I develop on Microsoft Azure using PHP and Azure Web Apps. In general, the application is using an <strong>OAuth2</strong> library to connect to a custom identity provider, the access token, <strong>refresh</strong> token and others are stored in $_SESSION. From the last sentence, you could have noticed two keywords - OAuth2 and refresh. The users started noticing an issue that after some time of working with the application (also the IdP was generating loads of useless token pairs), that they had to constantly relog. After turning on the logs, doing some diagnostics and trying to reproduce the issue, it was pretty clear - something fishy is going on with sessions.

<!--more-->What was actually happening was this - when the access token expires, the application attempts to renew the token using its refresh token. The issue was, that there could be parallel requests from the user (from AJAX calls for example) and the server would process them in parallel, which resulted in the following situation:
<ol>
 	<li><em>REQUEST1:</em> Inbound</li>
 	<li><em>REQUEST2:</em> Inbound</li>
 	<li><em>REQUEST1:</em> Access token is expired, attempt to renew</li>
 	<li><em>REQUEST2:</em> Access token is expired, attempt to renew</li>
 	<li><em>REQUEST1:</em> Got new access and refresh tokens, storing them into $_SESSION and fulfilling the request (at this point, the request is sent to client)</li>
 	<li><em>REQUEST2:</em> Token refresh failed, handle the failure, throw an error, etc.</li>
</ol>
From here, it is pretty obvious, <em>REQUEST2</em>  in parallel overwrites the token pair set into $_SESSION by <em>REQUEST1</em>. Let's take a look at why this happens.
<h1>Session storage in Azure Web Apps</h1>
From the default configuration, using phpinfo() to list all the settings related to sessions, we can see, that the <i>session.save_handler</i> is set to <b>wincache</b> and that the <i>session.save_path</i> is set to <b>D:\local\Temp</b>. When we look into the directory using Kudu (<i>https://yoursitename.scm.azurewebsites.net</i>) we won't see any session files in that directory - which turned me on a totally wrong path - I was actually trying to figure out where are the sessions being written to. However, when using <i>scandir</i> right in some PHP script, you will notice that some sessions are there.

[caption id="attachment_86" align="aligncenter" width="300"]<a href="/uploads/2016/09/php_session_configuration.png"><img class="size-medium wp-image-86" src="/uploads/2016/09/php_session_configuration-300x264.png" alt="Session configuration on current version of PHP on Azure Web Apps." width="300" height="264" /></a> Session configuration on current version of PHP on Azure Web Apps.[/caption]

The reason why you see the sessions in D:\local\Temp directly from the PHP script run in the browser is, that the Kudu (<i>scm</i>) is running in a different W3 Worker Process. Azure Web Apps is using a  shared storage across instances which is located at D:\<i>home</i> however, each <i>W3WP</i> process has its own local, temporary storage.

[caption id="attachment_89" align="aligncenter" width="300"]<a href="/uploads/2016/09/empty_dlocaltemp.png"><img class="size-medium wp-image-89" src="/uploads/2016/09/empty_dlocaltemp-300x239.png" alt="D:\local\Temp is empty when exploring from Kudu." width="300" height="239" /></a> D:\local\Temp is empty when exploring from Kudu.[/caption]

To be honest, it took me a while to figure this fact out.

[caption id="attachment_91" align="aligncenter" width="300"]<a href="/uploads/2016/09/session_scandir.png"><img class="size-medium wp-image-91" src="/uploads/2016/09/session_scandir-300x104.png" alt="D:\local\Temp content listed by scandir - this is what I expected it to look like in Kudu." width="300" height="104" /></a> D:\local\Temp content listed by scandir - this is what I expected it to look like in Kudu.[/caption]
<h2>Going a little bit deeper - sandbox</h2>
In the text above, I mentioned that the local directory (<em>D:\local</em>) is different for each W3WP. This is set by default to separate the SCM and actual web application. When I  write set, it means that this can be actually changed! It is not mentioned much at many places (only <a href="https://github.com/projectkudu/kudu/wiki/Configurable-settings">GitHub documentation</a>), but there is an option for it.

When you set an application setting or the <a href="https://github.com/projectkudu/kudu/wiki/Customizing-deployments">.deployment file</a> to contain <em>WEBSITE_DISABLE_SCM_SEPARATION=</em><em>true</em>. It is not going to sandbox the SCM process away from your application.

With that option in place, you will be able to see the content of <i>D:\local</i> from the web application in Kudu including <i>Temp</i> directory and its contents.

Last important thing is that this option should be mostly used for debugging and not for production (in production, you want as much isolation as you can get!).
<h1><b>Concurrent writing into sessions</b></h1>
There are many different ways on how to handle concurrent writing - you could use locks, semaphores and more. Speaking of PHP, it prevents concurrent session writing  by locking onto specific session file and whenever you are done with writing, you can call <b>session_write_close</b> to remove the lock and let other request with same session id to go through.
<blockquote>Tip: Session locks and concurrency are very nicely explained in <a href="https://ma.ttias.be/php-session-locking-prevent-sessions-blocking-in-requests/">this article</a>.</blockquote>
Obviously, in my case, this wasn't happening. The reason is, that with the default configuration, PHP on Azure Web Apps is set to use WinCache handler for sessions, despite the fact that it really works well, it kind of silently <a href="https://bugs.php.net/bug.php?id=59359">leaves out the session locking part</a>.

After figuring this fact out, all I had to do was to switch <em>session.save_handler</em> to <em>files</em>, restart the website (for the changes in <em>settings.ini</em> to take effect immediately) and everything was working again as expected.
<h1>WinCache sessions vs file sessions</h1>
So what's this WinCache and what is it good for? WinCache in general is a cache which makes PHP on Windows faster (read more about it <a href="http://us2.php.net/manual/en/intro.wincache.php">here</a>). It integrates with the opcode, user cache, file cache and also <a href="http://us2.php.net/manual/en/wincache.sessionhandler.php">sessions</a>. Major enhancement to sessions is that it stores the sessions in shared memory (and uses filesystem to persist the data during Application Pool recycle in IIS) which allows for faster access to session data.

As opposed to regular file session cache in PHP, it doesn't implement session locking for writes, so you may ned up with various issues like I ran into.
<h1>Wrap up</h1>
To wrap it up, I simply switched back to regular <em>files</em> in <em>session.save_handler</em> configuration and everything is now working as expected with session locks.
<h2>Additional reading</h2>
<ul>
 	<li><a href="https://github.com/projectkudu/kudu/wiki/Azure-Web-App-sandbox">Azure Web App Sandbox (github.com/projectkudu)</a></li>
 	<li><a href="https://github.com/projectkudu/kudu/wiki/Configurable-settings">Configurable settings (github.com/projectkudu)</a></li>
</ul>