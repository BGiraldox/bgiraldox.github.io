---
title: Azure Functions and Azure Files
date: 2020-02-14T09:00:00+02:00
author: Jan Hajek
categories:
  - Microsoft
  - Microsoft Azure
tags:
  - Azure Functions
  - App Service on Linux
  - Azure Web Apps
---

Lately, I have been playing with Azure Functions. Since the release of v3 runtime, I noticed a really cool thing which signifies a nice progress in overall App Service architecture as well.

If we go back few years, I have been blogging about [Speeding up your application in App Service](https://hajekj.net/2016/11/14/speed-up-your-application-in-azure-app-service/). The article provided some insight into why some applications, especially those running on runtimes using JIT compilation (like PHP) might be slow and what can be done about it. Tldr; the reason was primarily the speed of storage which proved to be a real bottleneck.

In the past days I had to troubleshoot some Functions triggers and while browsing through the storage, I noticed something which I wasn't expecting. For the Windows consumption plan - you can notice that a file share is created in the storage account associated with the function:

![Azure Functions Storage](/uploads/2020/02/azure-functions-files-structure.jpg)

This is quite a significant progress as Azure Files provide decent performance and capacity and are scalable.

Obviously, I wanted to learn more about how it works behind the scenes... Azure Functions are running on top of [Azure Web Jobs](https://github.com/Azure/azure-webjobs-sdk). Functions leverage that SDK and have their of [Functions Host](https://github.com/Azure/azure-functions-host). The host allows for your code to run within an environment where it is setup like Azure Functions, Azure Stack or even on-prem or 3rd party cloud via [KEDA](https://docs.microsoft.com/en-us/azure/azure-functions/functions-kubernetes-keda).

Since the host is open-source and available on GitHub, I decided to take a [peek](https://github.com/Azure/azure-functions-host/search?p=1&q=FileShare&unscoped_q=FileShare) (gotta love reading through GitHub, I really hope they enable [code navigation](https://help.github.com/en/github/managing-files-in-a-repository/navigating-code-on-github) for C# soon). The Functions host is really interesting piece of code, especially if you want to learn more about how it works - like dynamic extension downloading when using [C# script](https://docs.microsoft.com/en-us/archive/msdn-magazine/2016/january/essential-net-csharp-scripting) (.csx), bindings and much more.

Going through the code, you can easily bump into `MeshServiceClient` ([source](https://github.com/Azure/azure-functions-host/blob/d0410b6dd1c032765a53bc931330cc989b7edaaf/src/WebJobs.Script.WebHost/Management/MeshServiceClient.cs)) which exposes couple interesting methods - `MountCifs`, `MountBlob` and `MountFuse`. After further reading you can learn the following:
- `MountCifs` is used for mounting the Azure File Share associated with the function
- `MountBlob` is used when blob storage is used for storage
- `MountFuse` is used for [running from ZIP](https://docs.microsoft.com/en-us/azure/azure-functions/run-functions-from-deployment-package). It also appears to [include support](https://github.com/Azure/azure-functions-host/blob/bd350f348fd48c5ba12d0b540db45003dc915da2/src/WebJobs.Script.WebHost/Management/InstanceManager.cs#L440) for [SquashFS](https://en.wikipedia.org/wiki/SquashFS) which is a compression read-only filesystem for Linux (I haven't heard about it until now)

This generally means that the Function storage is no longer using the regular App Service storage which was slowing things down. And this may also have some good impact on cold starts as well.

One more interesting thing which caught my eyes was `MeshServiceClient` itself. Ever heard about [Service Fabric Mesh](https://docs.microsoft.com/en-us/azure/service-fabric-mesh/service-fabric-mesh-overview)? It is basically hyper scalable serverless platform for running microservices (probably more about that in another article). That means that Functions are probably moving away from App Service infrastructure into a more modern and scalable one!

The only thing which bothers me right now is that the File Shares are only mounted for Windows Consumption plans. I would really love to see the File Shares used more with App Service to see how much of a performance boost it can bring.

Also, just a side-note, with App Service on Linux you can already make use of mounted Azure Files / mounted blob storage ([docs](https://docs.microsoft.com/en-us/azure/app-service/containers/how-to-serve-content-from-azure-storage)). I will test the performance in future article.

Until next time...