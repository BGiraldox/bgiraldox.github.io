---
title: OpenAPI and Azure Functions Out-of-Process
date: 2021-04-24T09:45:00+02:00
author: Jan Hajek
categories:
  - Microsoft
  - Microsoft Azure
tags:
  - Azure Functions
  - OpenAPI
  - Swagger
---

Previously, I blogged about [OpenAPI and Azure Functions](/2020/05/11/generating-openapi-swagger-definition-from-azure-functions/) showcasing the way to generate a Swagger definition from Functions (before [official extension was available](https://github.com/Azure/azure-functions-openapi-extension), which I would pretty much go ahead with in hosted in-process). With the out-of-process model available, the extension is not going to work due to its dependency on the in-process model. So I decided to upgrade my previous demo to showcase how it can be done in the out-of-process hosting model.

![](/uploads/2021/04/functions-oop-swaggerui.png)

All I had to do to get this work, was to generate a function in .NET 5.0, create the model, respective endpoints and [annotate them](https://docs.microsoft.com/en-us/dotnet/csharp/codedoc) properly. Few more changes ahd to be done due to [differences](https://docs.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide) between `HttpRequest` and `HttpRequestData` and also `HttpResponse` and `HttpResponseData` (but that was fairly simple to deal with).

I have also added a nice feature - the Function now serves [Swagger UI](https://github.com/swagger-api/swagger-ui)! It was easier to add than I thought, simply add a [HTML page](https://github.com/hajekj/azure-functions-openapi-demo/blob/master/Pages/swagger-ui.html), add the Swagger UI styles and scripts from CDN, create a [function to serve the static file](https://github.com/hajekj/azure-functions-openapi-demo/blob/master/Function1.cs#L49) and you are good to go!

In the demo, there are now two definition endpoints `/api/Swagger` (returns OpenAPI 3.0 definition) and `/api/SwaggerV2` (returns Swagger - OpenAPI 2.0 definition) - both of them can be rendered in the UI (yes, the naming is kinda meh, but it's just a demo).

One thing which is missing [compared to the original](https://github.com/hajekj/azure-functions-openapi-demo/tree/inproc-3.1) (I have moved the in-process sample to its own branch), is the support for parsing of form data - [`ReadFormAsync`](https://docs.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.http.requestformreaderextensions.readformasync?view=aspnetcore-5.0). Due to the request being passed in as `HttpRequestData` (which has nothing to do with `HttpRequest`) you can't use the ASP.NET Core one out of box, but you can leverage a [similar](https://github.com/Http-Multipart-Data-Parser/Http-Multipart-Data-Parser) one or tweak the [ASP.NET Core implementation](https://github.com/dotnet/aspnetcore/blob/52eff90fbcfca39b7eb58baad597df6a99a542b0/src/Http/Http/src/Features/FormFeature.cs) to work with `HttpRequestData`.

Full sample: [**https://github.com/hajekj/azure-functions-openapi-demo**](https://github.com/hajekj/azure-functions-openapi-demo)

Also, if you need to add Azure AD authentication to Functions running in out-of-process model, check out [my previous post](/2021/04/22/azure-functions-out-of-process-and-authentication-with-azure-ad/).