---
title: UseHttpsRedirection on Azure App Service
date: 2018-09-07T08:00:43+02:00
author: Jan Hajek
permalink: /2018/09/07/usehttpsredirection-on-azure-app-service/
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - ASP.NET Core
  - Azure Web Apps
---

<p>Recently, when deploying a project, we have hit an interesting issue - when we deployed an ASP.NET Core 2.1 application with HTTPS redirection middleware with HSTS middleware disabled, however the redirection wasn't working correctly.</p>

<!--more-->

<p>You will not notice this behavior when you use it along with HSTS middleware since it will perform almost the same action, however without the HSTS middleware it will not do anything.</p>

<p>When you hit the <a href="https://github.com/aspnet/Docs/blob/6045abe21b5e449bc4bf1f6a8a9e902c75542e0c/aspnetcore/security/enforcing-ssl.md">documentation</a> you can see it says that it is going to default to port 443 which is not correct. This behavior has been <a href="https://github.com/aspnet/Announcements/issues/301">changed in 2.1.0-rc1 version</a>. I have already submitted a <a href="https://github.com/aspnet/Docs/pull/8390">PR</a> to resolve this.</p>

<p>When you go into the&nbsp;<a href="https://github.com/aspnet/BasicMiddleware/blob/f320511b63da35571e890d53f3906c7761cd00a1/src/Microsoft.AspNetCore.HttpsPolicy/HttpsRedirectionMiddleware.cs"><em>HttpsRedirectionMiddleware</em></a>&nbsp;you can notice that it is trying to detect the HTTPS port in&nbsp;<a href="https://github.com/aspnet/BasicMiddleware/blob/f320511b63da35571e890d53f3906c7761cd00a1/src/Microsoft.AspNetCore.HttpsPolicy/HttpsRedirectionMiddleware.cs#L108"><em>TryGetHttpsPort</em> method with following logic</a>:</p>

<ol><li>Set in the HttpsRedirectionOptions</li><li>HTTPS_PORT environment variable</li><li>IServerAddressesFeature</li><li>Fail if not set</li></ol>

<p>That basically means that either the server or application has to be configured with the port, else the middleware will treat it like not being configured. Since App Service workers lay behind a reverse proxy which handles HTTPS termination and just passes the&nbsp;<em>X-Forwarded-*</em> headers to the workers which then restore it for the request pipeline in IIS.</p>

<p>So the solution is simple - either go to your Application Settings in App Service and add a setting ASPNETCORE_<em>HTTPS_PORT</em> with value&nbsp;<em>443</em>. If you don't want to do it in application settings, you can configure the port from within the code:</p>

```csharp
services.AddHttpsRedirection(options => { options.HttpsPort = 443; });
```

<p>Quite simple and powerful.</p>

<p>Alternatively, you can also make use of App Service's newly introduced&nbsp;<em>HTTPS Only</em> feature which will result in HTTPS redirect on the server level rather than the application one - it is easier than most of the solution above and works just by flipping a switch - however you have to keep on mind to flip it on with all new deployments and it makes the application slightly more platform dependent.</p>
<figure class="wp-block-image"><img src="/uploads/2018/09/AppService-HTTPS-Configuration.png" alt="" class="wp-image-745"/></figure>
