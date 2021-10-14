---
title: Upgrading to WebJobs SDK 3.0
date: 2018-10-08T08:00:29+02:00
author: Jan Hajek
permalink: /2018/10/08/upgrading-to-webjobs-sdk-3-0/
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - Azure Web Apps
  - WebJobs
---

<p>With the recent release of Azure Functions Runtime 2.0, WebJobs SDK 3.0 got released alongside. WebJobs SDK is the backbone of Azure Functions, however it can be also used standalone to power Azure WebJobs which you can host alongside your App Service. SDK 3.0 brings the configuration much closer to ASP.NET Core, runs under both .NET Framework and .NET Core and for example supports Dependency Injection by default.</p>

<!--more-->

<p>SDK 3.0 was released a while ago, however there is no changelog available (yet) neither the documentation or the <a href="https://github.com/Azure/azure-webjobs-sdk-samples">samples</a> were upgraded yet. I decided to upgrade anyways, since the SDK is <a href="https://github.com/Azure/azure-webjobs-sdk">opensource</a>&nbsp;so if I hit some issue, I can troubleshoot it myself. Luckily, this wasn't much of a case.</p>

<p>First off, you want to start with upgrading Nuget packages to the latest versions. Then, you will need to modify the&nbsp;<em>Program.cs</em> setup. Like mentioned above, SDK 3.0 brings WebJobs much closer to ASP.NET Core configuration, which is pretty nice. You might want to take a look at the only sample at the time of writing which is <a href="https://github.com/Azure/azure-webjobs-sdk/blob/dev/sample/SampleHost/Program.cs">included with the SDK's source</a>.</p>

<p>However, you can notice few things, which I would say should not made it into the sample:</p>

<p>First off, the <em>Envionment</em>&nbsp;is configured statically by&nbsp;<em>UseEnvironment</em>&nbsp;- which I really don't like. In ASP.NET Core, you can configure Environment by&nbsp;<em>ASPNETCORE_ENVIRONMENT</em> env variable, here this one won't work. Since ASP.NET Core uses <em>WebHostBuilder</em> and WebJobs use&nbsp;the <em>HostBuilder</em>, there are few differences: In order to specify environment, you need to use&nbsp;<a href="https://github.com/aspnet/Hosting/blob/f9d145887773e0c650e66165e0c61886153bcc0b/src/Microsoft.Extensions.Hosting.Abstractions/HostDefaults.cs#L19"><em>environment</em></a> variable name, just like that.</p>
<figure class="wp-block-image"><img src="/uploads/2018/10/webjobs-enviornment.png" alt="" class="wp-image-765"/><figcaption>You can setup the environment variable in the Debug options of your project just like with ASP.NET Core.</figcaption></figure>
<p>Next, I really like the concept of <a href="https://docs.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-2.1&amp;tabs=windows">User Secrets in ASP.NET Core</a> for development, so why not use those here too? In order to do that, you will need to make two modifications. First, setup the UserSecretsId assembly attribute on the&nbsp;<em>Program</em>&nbsp;class:</p>

```csharp
[assembly: UserSecretsId("project-name")]
```

<p>Thanks to this, the assembly will now contain the information about User Secrets. In ASP.NET Core, this is defined in&nbsp;<em>.csproj</em>&nbsp;- so far, I haven't found a way to do this with a WebJob - the build seems to ignore it. I will probably dedicate it a separate article. And then, you need to setup&nbsp;<em>ConfigureHostConfiguration</em> on the&nbsp;<em>HostBuilder</em> like so:</p>

<p>This is going to tell it to use Command Line arguments, Environment Variables and Secrets. Next up is the configuration of all the required triggers which you might be using in&nbsp;<em>ConfigureWebJobs</em> section:</p>

```csharp
.ConfigureHostConfiguration(config =>
{
    config.AddCommandLine(args);
    config.AddEnvironmentVariables();
    config.AddUserSecrets<Program>();
})
// ...
.ConfigureWebJobs(config =>
{
    config.AddAzureStorageCoreServices();
    config.AddTimers();
})
```

<p>Basically,&nbsp;<em>AddAzureStorageCoreServices</em> makes sure that your WebJob is hooked to a storage account for persisting data, creating logs etc.&nbsp;<em>AddTimers</em> is from <a href="https://www.nuget.org/packages/Microsoft.Azure.WebJobs.Extensions/">WebJobs.Extensions</a>&nbsp;package and allows you to periodically trigger some tasks. You can also use <a href="https://www.nuget.org/packages?q=WebJobs.Extensions">other extensions</a> to connect to Event Grid, Service Bus etc.</p>

<p>Then you should configure logging by&nbsp;<em>ConfigureLogging</em>. In the sample, they don't check the environment and simple set the debug level to Debug, however since we set the environment previously, we can set it based on the environment:</p>

```csharp
.ConfigureLogging((context, config) =>
{
    if (context.HostingEnvironment.IsDevelopment())
    {
        config.SetMinimumLevel(LogLevel.Debug);
        config.AddConsole();
    }
})
```

<p>Then we need to configure the Dependency Injection if needed by&nbsp;<em>ConfigureServices</em>.</p>

```csharp
.ConfigureServices((context, services) =>
{
    services.AddMemoryCache();
    services.AddSingleton(context.Configuration);
    services.AddSingleton();
    services.AddScoped<Functions, Functions>();
})
```

<p>Remember to always register your&nbsp;<em>Functions</em> class into services, if you don't do that, the depedendency injection will not work properly.</p>

<p>Here I have hit a thing which I need to investigate a bit further - the SDK 3.0 seems to support DI by default however, it doesn't seem to work:</p>

<p>Event tho the runtime registers&nbsp;<em>DefaultJobActivator</em>, it doesn't seem to resolve the services from the container and you end up with:&nbsp;<em>System.MissingMethodException: No parameterless constructor defined for this object.</em>&nbsp;error, so instead I decided to use my own&nbsp;<em>IJobActivator</em>&nbsp;implementation from SDK 2.0:</p>

```csharp
class JobActivator : IJobActivator
{
    private readonly IServiceProvider _service;

    public JobActivator(IServiceProvider service)
    {
        _service = service;
    }
    public T CreateInstance<T>()
    {
        return (T)_service.GetService(typeof(T));
    }
}
```

<p>You simply register it into the DI and it is going to work fine. I am not quite sure why the default activator doesn't work for me yet - I will investigate it and update the article if I end up with some results.</p>

<p>Last thing to do is to start using .NET Core logging which basically means, that you replace <em>TextWriter</em>&nbsp;with&nbsp;<em>ILogger</em> and use it just like in an ASP.NET Core app. You can leave TextWriter as is since it will work, however I suggest you switch to ILogger so that you have unified logging across the app. You can optionally add Application Insights if needed - those are part of the sample.</p>
