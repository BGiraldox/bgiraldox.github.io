---
title: Tracking currently signed-in user in Application Insights
date: 2017-03-13T07:40:33+01:00
author: Jan Hajek
permalink: /2017/03/13/tracking-currently-signed-in-user-in-application-insights/
categories:
  - Microsoft
  - Microsoft Azure
tags:
  - Application Insights
  - ASP.NET Core
---

<p>Whenever you are collecting a date with <a href="https://azure.microsoft.com/en-us/services/application-insights/">Application Insights</a>, it might be handy to have the ability to filter the telemetry based on currently signed in user. The documentation is quite confusing about it, so I decided to write an article and clear it up.</p>

<!--more-->

<p>So after setting up Application Insights in your application as per the <a href="https://github.com/Microsoft/ApplicationInsights-aspnetcore/wiki/Getting-Started">Getting Started documentation</a>, telemetry will start to get collected and will show up in the portal - however, when the user signs in, for example with Azure AD, you won't get any such information in the telemetry. This can be a sort of pain point, when you get report from one user that something is not working and you need to inspect the telemetry for that user.</p>

<h1>JavaScript</h1>

<p>If you want to add current user to the telemetry from JavaScript,&nbsp;the process is <a href="https://docs.microsoft.com/en-us/azure/application-insights/app-insights-web-track-usage#authenticated-users">well document and explained</a>.</p>

<h1>ASP.NET Core</h1>

<p>In ASP.NET (on the server-side) there isn't much guidance for how to do this correctly. You could modify the telemetry data yourself by for example <a href="https://github.com/Microsoft/ApplicationInsights-aspnetcore/wiki/Configure#add-additional-telemetry-item-properties">setting custom properties for each telemetry request</a>, or you could , but there is a much more cleaner way to do this - we will create our own implementation of&nbsp;<em>ITelemetryInitializer</em>, so whenever&nbsp;telemetry is supposed to be sent, the request will have the information populated automatically.</p>

<p>With classic ASP.NET, you would implement the&nbsp;<em>ITelemetryInitializer</em> and then add it to the&nbsp;<em>TelemetryInitializers</em> list (described <a href="http://apmtips.com/blog/2014/12/01/telemetry-initializers/">here</a> for example). This works for ASP.NET, however you usually want to pull the current user information from&nbsp;request's claims (<em>HttpContext.User</em>), which is possible from within ASP.NET, but with ASP.NET Core, there is no&nbsp;<em>HttpContext.Current</em> accessor. So we have to take another approach - using Dependency Injection, which does the job for us!</p>
<blockquote class="wp-block-quote"><p>It took me a while to figure out, that the AI for ASP.NET Core is internally depending on the Dependency Injection container, which makes a lot of things simple and straightforward. You can look at the <a href="https://github.com/Microsoft/ApplicationInsights-aspnetcore/blob/3567c4af164a0e01ee0630b8d77251171ba7d42b/src/Microsoft.ApplicationInsights.AspNetCore/Extensions/ApplicationInsightsExtensions.cs#L123">source of AI for ASP.NET Core package</a> for reference.</p></blockquote>
<p>So we implement an&nbsp;<em>ITelemetryInitializer</em> like usual, except that in the constructor, we are going to require&nbsp;<em>IHttpContextAccessor</em> which then allows us to access the correct&nbsp;<em>HttpContext</em> (more about it can be found <a href="http://www.aaronhammond.net/2015/08/mvc6-and-ihttpcontextaccessor.html">here</a>). You can see an example implementation below. The rest is then just about setting the property values to whatever you need them to be.</p>

```csharp
public class AppInsightsInitializer : ITelemetryInitializer
{
    private IHttpContextAccessor _httpContextAccessor;
    public AppInsightsInitializer(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor ?? throw new ArgumentNullException("httpContextAccessor");
    }
    public void Initialize(ITelemetry telemetry)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext != null && httpContext.User.Identity.IsAuthenticated == true && httpContext.User.Identity.Name != null)
        {
            telemetry.Context.User.AuthenticatedUserId = httpContext.User.Identity.Name;
            telemetry.Context.User.AccountId = httpContext.User.FindFirst(AppClaimTypes.TenantId).Value;
        }
    }
}
```

<p>A lot of great samples of&nbsp;<em>ITelemetryInitializer</em> implementation can be found in the <a href="https://github.com/Microsoft/ApplicationInsights-aspnetcore/tree/3567c4af164a0e01ee0630b8d77251171ba7d42b/src/Microsoft.ApplicationInsights.AspNetCore/TelemetryInitializers">official repo which contains some of the default ones</a>.</p>

<p>After that, you just add this class to the DI container like so:</p>

```csharp
services.AddSingleton<ITelemetryInitializer, AppInsightsInitializer>();
```

<p>Now you can see the user data in the telemetry as well. You could use the same if there is <a href="https://www.cloudflare.com">CloudFlare</a>&nbsp;in front of you web server and you need to show the real user's IP address in the telemetry (passed as&nbsp;<em>CF-Connecting-IP</em> header in the request).</p>
