---
title: Azure Functions out-of-process and authentication with Azure AD
date: 2021-04-22T15:15:00+02:00
author: Jan Hajek
categories:
  - Microsoft
  - Microsoft Azure
tags:
  - Azure Functions
  - Azure AD
  - Microsoft Graph
  - Identity
  - MSAL
  - Authentication
redirect_from:
  - /2022/04/22/azure-functions-out-of-process-and-authentication-with-azure-ad/
---

Last year I managed to get [Microsoft.Identity.Web running with Azure Functions](/2020/12/12/microsoft-identity-web-and-azure-functions/). During the time, Microsoft released a new model for hosting Functions on .NET called [out-of-process ](https://docs.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide). This is used to run Functions in .NET 5.0, will be available with 6.0 and will be the only model available since .NET 7.0 as per [roadmap](https://techcommunity.microsoft.com/t5/apps-on-azure/net-on-azure-functions-roadmap/ba-p/2197916). The out-of-process model comes with numerous differences, so I am going to go through those and show you, how to get authentication via Azure AD running there (and mimick some of the MIW functionality).

# Differences between out-of-process and in-process
The major difference, which prevents us to use Microsoft.Identity.Web is the lack of `HttpContext`. At the moment, the out-of-process model uses [`HttpRequestData`](https://docs.microsoft.com/en-us/dotnet/api/microsoft.azure.functions.worker.http.httprequestdata?view=azure-dotnet). It is quite different from `HttpContext` (part of [`HttpRequest`](https://docs.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.http.httprequest?view=aspnetcore-5.0)) which MIW heavily depends upon.

There are other differences which are not super relevent for authentication, but you can find the full list in [Microsoft's docs](https://docs.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide#differences-with-net-class-library-functions).

## A slight issue with in-process and Microsoft.Identity.Web
After some time running MIW in Functions (in-process) I noticed an issue - in your Azure Portal you might end up with `Azure Functions Runtime is unreachable` error when trying to work with it in the portal. The issue is caused by the [built-in authentication providers](https://github.com/Azure/azure-functions-host/blob/9a5c240f32dcd4c084ee86147de7b0f4f08176cb/src/WebJobs.Script.WebHost/WebHostServiceCollectionExtensions.cs#L47) being somehow overriden by the [Dependency Injection extension](https://github.com/Azure/azure-functions-dotnet-extensions/tree/92b3758ac51a99ca9086c9f2202177b34d7fb88a/src/Extensions/DependencyInjection). I haven't managed to get deeper into this to figure out what exactly is happening, but the [docs state](https://docs.microsoft.com/en-us/azure/azure-functions/functions-dotnet-dependency-injection#overriding-host-services) that you shouldn't override the host services, which is sort of what happens.

This issue doesn't prevent your Functions from working, however you won't be able to use Function keys (you don't need them since you are using Azure AD anyways, right?) for authentication or the portal integration like mentioned above. The support for modifying authentication providers was requested in both [Functions host](https://github.com/Azure/azure-functions-host/issues/6805) and [Microsoft.Identity.Web](https://github.com/AzureAD/microsoft-identity-web/issues/916) repos. In the MIW repo, there has been a nice discussion about this, and Valks came out with a [solution](https://github.com/AzureAD/microsoft-identity-web/issues/916#issuecomment-785512851) which involves restoring the providers via a reflection (because you can't access the `AddArmToken`, `AddScriptAuthLevel` and `AddScriptJwtBearer` methods from your code due to the nature of how Functions runtime works).

> Note: I am mentioning this issue because the out-of-process model avoids the conflicts with the host.

# Authenticating in out-of-process
> I am assuming here that you are going to be using Azure Functions as an API (eg. calling it with `Authorization: Bearer <token>` header).

## Easy way with Easy Auth
I love simply [EasyAuth](https://docs.microsoft.com/en-us/azure/app-service/overview-authentication-authorization)! It works out of box and provides token validation and bunch of others things. It still works in out-of-process, is simple and you just read the information from headers in `HttpRequestData`. Some basic sample (not out-of-process related can be found [here](https://markheath.net/post/secure-azure-functions-app-easy-auth-adb2c)).

## The more complex way with MSAL (Microsoft.Identity.Web-like)
Earlier this month, [a new feature request appeared](https://github.com/AzureAD/microsoft-identity-web/issues/1124) in Microsoft.Identity.Web repo for support of .NET 5.0 Functions. I have done some [slight assessment](https://github.com/AzureAD/microsoft-identity-web/issues/1124#issuecomment-815262381) of the issue already, but generally I think the implementation should wait until there is some further clarification from Microsoft on `HttpContext` support in the [.NET worker](https://github.com/Azure/azure-functions-dotnet-worker/).

So how to approach this now? Since the `Microsoft.AspNetCore.Authentication.JwtBearer` won't work in the out-of-process model (since it again depends on `HttpContext` and ASP.NET Core pipeline) you will need to handle the token validation yourself. I am not going to go too deep into this because [Christos](https://cmatskas.com/create-an-azure-ad-protected-api-using-azure-functions-and-net-core-3-1/) and [Damien](https://damienbod.com/2020/09/24/securing-azure-functions-using-azure-ad-jwt-bearer-token-authentication-for-user-access-tokens/) both did an awesome job describing what is required to get this work.

I have just made some slight modifications to the code to support the `HttpRequestData` and a few optimizations to cache the OIDC configuration. Now that the user is authenticated, we might want to get a token to call a downstream API, right? This is usually handled via [`ITokenAcquisition`](https://github.com/AzureAD/microsoft-identity-web/blob/master/src/Microsoft.Identity.Web/ITokenAcquisition.cs) implementation, so I borrowed the method name (`GetAccessTokenForUserAsync`) and implemented it to run in out-of-process! Thanks to it, we can now make calls to Microsoft Graph or any other API which the user consented to!

![](/uploads/2021/04/functions-oop-graph.png)

You can find the sample code on my GitHub: **[https://github.com/hajekj/azure-functions-dotnet-worker-miw](https://github.com/hajekj/azure-functions-dotnet-worker-miw)**

> Note: Once again, the code is really dirty, I just put the pieces together to get it working for a demo. You can easily make it work with B2C by switching the authority and providing the flow name.

---

**Update:**

Since the out-of-process model supports using custom middlewares, I started to [implement the authentication one](https://github.com/hajekj/azure-functions-dotnet-worker-miw/blob/master/WorkerAuthentication/AuthenticationMiddleware.cs). However, there seem to be quite a few limitations which I [described in a GitHub issue](https://github.com/Azure/azure-functions-dotnet-worker/issues/414), hoping that someone will help out or provide guidance.