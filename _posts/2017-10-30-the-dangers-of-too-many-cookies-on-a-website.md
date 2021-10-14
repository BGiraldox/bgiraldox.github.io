---
title: The dangers of too many cookies on a website
date: 2017-10-30T09:00:24+01:00
author: Jan Hajek
permalink: /2017/10/30/the-dangers-of-too-many-cookies-on-a-website/
image: /wp-content/uploads/2017/08/cookies2.png
categories:
  - Open Source
tags:
  - ASP.NET Core
  - Cookies
  - PHP
---
Sometimes, when browsing Microsoft's sites, you can run into some weird errors - like <em>Bad Request - Request too long</em> or sometimes even <em>Connection refused</em>. These errors are mostly caused by cookies. In this article, I am going to show you the most common causes and also tips on how to avoid these issues on your sites.

<!--more-->

Coming originally from the PHP world, I wasn't really used to using cookies directly much - mostly used sessions for everything.
<h1>Sessions</h1>
Sessions are one of the easiest (and in PHP probably the most common) way to persist data for the user's browsing session. It creates a single cookie and sends it to the user, usually it contains a unique identifier of the specific session which is then linked to the data stored on the server. In PHP the most common way to store session data is file system. In ASP.NET Core, sessions are handled by an <a href="https://docs.microsoft.com/en-us/aspnet/core/performance/caching/memory">in-memory cache</a> by default.

In PHP and probably other languages as well, sessions also make it very easy to handle concurrent requests (I wrote about this in <a href="https://hajekj.net/2016/09/25/session-locking-in-php-on-azure-web-apps/">Session locking in PHP on Azure Web Apps</a>), which may be important for your application or at least make things easier for you (in cases where you handle token renewals for example).

When coding modern websites, you are going to try to achieve a stateless architecture, which means that there is no state stored directly on the server. Going stateless allows you to easily and rapidly scale your service, since there is no data persisted on the web workers. Sessions, in their default implementation of course make the web stateful, since the data has to be persisted somewhere - typically in the filesystem or server's memory.

One way to disconnect the session storage from the web workers is to use an external storage for the sessions - implemented in ASP.NET Core as <a href="https://docs.microsoft.com/en-us/aspnet/core/performance/caching/distributed">distributed cache</a>, additionally, one of the methods to handle this in PHP is to use a persistent shared storage across web workers, which is very typical for shared web hosts. Typically, Redis or Memcached is used for the storage, however you can store the session data in SQL, <a href="https://scotthelme.co.uk/offloading-php-session-storage-to-azure-table-storage/">Azure Table Storage</a> and others (we are not going to discuss the efficiency of those methods in this article).
<h1>Individual cookies</h1>
The "stateless" way to store data for the user is to store the data directly in cookies. While this sounds very easy, it introduces a lot of challenges on its own.
<h2>Cookie limits on client</h2>
Let's start with one of the most important parts - limits. While it may seem like a weird joke, browsers actually enforce limits on cookies. As defined per <a href="http://www.ietf.org/rfc/rfc2109.txt">RFC 2109</a> (#6.3) and <a href="http://www.ietf.org/rfc/rfc2965.txt">RFC 2965</a> (#5.3) further, a browser should be able to accept at least 300 cookies which are maximum of 4096 byte size each (including all parameters, so not just the value itself). While most browsers follow that RFC (you can check the actual limits of the browsers and even test your browser in real-time <a href="http://browsercookielimits.squawky.net/">here</a>), there was a case where specific release of Safari on iOS was dropping cookies when the total size was over 14kB (I wrote about that issue <a href="https://hajekj.net/2017/03/20/cookie-size-and-cookie-authentication-in-asp-net-core/">here</a>, the issue has already been fixed in iOS 11).
<h3>Storing large data in cookies</h3>
Now what if you need to store some large amount of data in the cookie? Say the entire Identity of the user in ASP.NET Core? It is usually going to result in a cookie which is longer than 4096 bytes (way longer in some cases - for example, when you store all <em>id_token</em> claims into it, or use it as a <a href="https://github.com/aspnet/Security/blob/22d2fe99c6fd9806b36025399a217a3a8b4e50f4/samples/OpenIdConnect.AzureAdSample/AuthPropertiesTokenCache.cs">token cache for ADAL</a>). ASP.NET Core is actually very smart about it, if the resulting cookie is too big, it <a href="https://github.com/aspnet/Security/blob/dev/shared/Microsoft.AspNetCore.ChunkingCookieManager.Sources/ChunkingCookieManager.cs">chunks it into parts</a> (and then serializes them back).
<h2>Request size</h2>
Another important part, which is often overlooked by developers is the resulting request size with cookies.

Let's say that your cookies have 4kB in size altogether. When you load the website, it also downloads additional resources (like CSS, JS, images etc.). If it is all coming from the same domain, the cookie header will be added to all the requests, so you are going to make the request way larger than it would generally be.

While we don't really have to care about this on computers which have very good connection, there is a growing part of the user base of Internet using mobile devices. While the user base of mobile devices is growing quite rapidly, the coverage from the operators is not so good and in many parts of the world you still have to use EDGE and similar speeds. With EDGE speeds, all kilobytes do count, not speaking of enforced FUP limits in many countries.
<h2>Server limits</h2>
Now we are getting back to the original pain point errors of similar type:

<a href="/uploads/2017/08/cookies.png"><img class="aligncenter size-medium wp-image-519" src="/uploads/2017/08/cookies-300x99.png" alt="" width="300" height="99" /></a>These are caused by the actual server limits. Most of the servers actually enforce various limits on the requests (like header size, maximum post size, maximum request length and others). Cookies are of course affected by the maximum header size limit, this limit varies based on the used server:
<ul>
 	<li>Internet Information Services (WS2016) - 16kB per header
<ul>
 	<li>These limits can be further configured to support a header of up to 16MB each. Configuration instructions can be found <a href="https://docs.microsoft.com/en-us/iis/configuration/system.webserver/security/requestfiltering/requestlimits/headerlimits/">here</a>.</li>
</ul>
</li>
 	<li>Nginx - 8kB altogether
<ul>
 	<li>The limit can be changed as per instructions <a href="http://nginx.org/en/docs/http/ngx_http_core_module.html#large_client_header_buffers">here</a>.</li>
</ul>
</li>
 	<li>Apache (2.2) - 8kB altogether
<ul>
 	<li>The limit can be changed as per instructions <a href="http://httpd.apache.org/docs/2.2/mod/core.html#limitrequestfieldsize">here</a>.</li>
</ul>
</li>
 	<li>Kestrel - 32kB altogether, maximum of 100 headers
<ul>
 	<li>The limit can be changed in <a href="https://docs.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.server.kestrel.kestrelserverlimits?view=aspnetcore-1.1">KestrelServerLimits</a>.</li>
</ul>
</li>
</ul>
From the numbers above you can see that each server implements different maximum header size. Basically, it is safe to say that by default, your cookies shouldn't exceed 4kB of size by default configuration.

When you exceed the server limit, you are going to get an error - either the server is going to display an error page and terminate the request or simply terminate the request without giving response.
<h1>Solution</h1>
By now, you probably understand the problems tied to using cookies too much with your websites. We are now going to explore solutions for both users and developers.
<h2>Users</h2>
The user solution is very simple when you run into such an issue - clear your cookies for the specific site. You can do so from the Developer Tools of your browser or from the settings. You can find ou more about that <a href="http://lmgtfy.com/?q=chrome+clear+cookies+for+specific+site">here</a>.
<h2>Developers</h2>
The user part was easy, now the part for developers...

Sometimes it is really fun to just open the Developer Tools's Network tab and see how much data is passed back and forth without any need for those data to be present at all.
<h3>Use HTML5 for local storage</h3>
When you need to store some data in the browser and there is no need to access them on the server-side, use different storage than cookies - <a href="https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage">localStorage</a> is a viable replacement.
<h3>Use Session Storage when necessary</h3>
If you don't need to access the cookie data on the client, it is safe to use sessions when necessary. You can implement <a href="https://docs.microsoft.com/en-us/aspnet/core/api/microsoft.aspnetcore.authentication.cookies.iticketstore"><em>ITicketStore</em></a>, and use it to store the <a href="https://github.com/aspnet/Security/blob/rel/2.0.1/src/Microsoft.AspNetCore.Authentication.Cookies/CookieAuthenticationOptions.cs">Cookie Authentication</a> claims into it by overriding <a href="https://docs.microsoft.com/en-us/aspnet/core/api/microsoft.aspnetcore.builder.cookieauthenticationoptions#Microsoft_AspNetCore_Builder_CookieAuthenticationOptions_SessionStore"><em>SessionStore</em></a> variable.

It will be used at the expense of having a stateful application, however you can start small with a simple in-memory implementation and later go bigger with a distributed cache implementation. Sample implementation is <a href="https://github.com/aspnet/Security/blob/22d2fe99c6fd9806b36025399a217a3a8b4e50f4/samples/CookieSessionSample/MemoryCacheTicketStore.cs">here</a>.
<h3>Split cookies per subdomain and site paths</h3>
In most of the cases, and I will explain this down below, the issue isn't the amount of cookie data stored, but that the cookies are not targeted correctly. You can make use of <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#Scope_of_cookies">path and domain attributes</a>. Additionally, you can also <a href="https://paladion.net/cookie-attributes-and-their-importance/">read about the importance of setting correct attributes in relation to security</a>.

You can also dedicate a subdomain with static resources which will not receive the cookies at all (if you make sure the domain is set correctly).
<h1>Why this makes me really angry</h1>
Personally, whenever I see <em>Bad Request - Request too long</em> error, I get very angry. The thing is - I mostly see it on Microsoft's sites. Sometimes the Azure Portal, quite often on Azure AD's login page, sometimes Microsoft.com, Office 365's Portal and other sites.

Whenever I go to the Developer Tools to clear the cookies for that specific site, I am always stunned by the amount of cookies. I just checked on the login page of Azure AD and it is currently 12kB.

<a href="/uploads/2017/10/cookies3.png"><img class="aligncenter size-medium wp-image-531" src="/uploads/2017/10/cookies3-300x152.png" alt="" width="300" height="152" /></a>This has been ongoing for couple of years and either I am the only one who is affected by this issue.

If you got this far, you can enjoy this video which I found when I was looking for similar articles in case someone wrote about this issue already.

https://www.youtube.com/watch?v=vC1qjHL4NRQ