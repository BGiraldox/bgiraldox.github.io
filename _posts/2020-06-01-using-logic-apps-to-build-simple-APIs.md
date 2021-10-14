---
title: Using Logic Apps to build simple APIs
date: 2020-06-01T09:30:00+02:00
author: Jan Hajek
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - Azure Web Apps
  - Azure Functions
  - Logic Apps
---

[Logic Apps](https://azure.microsoft.com/en-us/services/logic-apps/) are Microsoft's solution for integrations and also a codeless development platform (declarative). If you heard of [Microsoft Power Automate](http://flow.microsoft.com/) (formerly known as Microsoft Flow) - which is a citizen developer's tool to build workflows in a nice visual designer - it runs on top of Logic Apps backend as well.

> This article is part of [#ServerlessSeptember](https://aka.ms/ServerlessSeptember2020). You'll find other helpful articles, detailed tutorials, and videos in this all-things-Serverless content collection. New articles from community members and cloud advocates are published every week from Monday to Thursday through September. 
> 
> Find out more about how Microsoft Azure enables your Serverless functions at [https://docs.microsoft.com/azure/azure-functions/](https://docs.microsoft.com/azure/azure-functions/?WT.mc_id=servsept20-devto-cxaall). 

Thanks to Logic Apps you can easily create event-based (HTTP, Storage, Queue, Microsoft Graph, ...) triggered workflows which then perform some actions. In this article, we will focus on those HTTP triggered ones and how-to build a nice and simple API with those.

First off, we start by [creating a Logic App in Azure Portal](https://docs.microsoft.com/en-us/azure/logic-apps/quickstart-create-first-logic-app-workflow) (you can also do it in Visual Studio or VS Code). We then start with creating a HTTP trigger (every Logic App needs to have a trigger of some form). Now, when you save the Logic App, the trigger will be something like this (your hostname may be different):

```
https://prod-26.westeurope.logic.azure.com:443/workflows/<id>/triggers/manual/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=<signature>
```

And by default, it will accept only HTTP `POST` requests. We can modify it to accept `GET` or any other HTTP method which we are used to (I switched it to GET for this sample).

![](/uploads/2020/06/logic-apps-http-trigger-method.jpg)

Now obviously, the address above is not really something you want to expose to the public, because of couple of reasons - you probably want to authenticate your API in some nice way, and you also may want to put it to a nicer address like `api.domain.com` so that the consumers can work with it nicely.

Here's where you have few options - you can achieve it [via API Management](https://docs.microsoft.com/en-us/azure/api-management/import-logic-app-as-api) (which I will not cover in this article), but you can also achieve it via - wait for it - [Azure Functions](https://azure.microsoft.com/en-us/services/functions/)! More specially the [proxies feature](https://docs.microsoft.com/en-us/azure/azure-functions/functions-proxies).

So in order to get started, we create an Azure Function (I stick with [Consuption plan](https://docs.microsoft.com/en-us/azure/azure-functions/functions-scale#consumption-plan)), create a proxy for our previously created Logic App  like so:

![](/uploads/2020/06/logic-apps-create-functions-proxy.jpg)

After that, your Logic App will be reachable at the Function's address:

```
https://<name>.azurewebsites.net/api/mycustomapiget
```

Next step would be to [map your custom domain](https://docs.microsoft.com/en-us/azure/app-service/app-service-web-tutorial-custom-domain) and obviously setup HTTPS (preferably with [App Service Managed Certificates](https://docs.microsoft.com/en-us/azure/app-service/configure-ssl-certificate#create-a-free-certificate-preview) which are free!).

Alrighty, now we have a Logic App, hidden behind a nice URL with Azure Function Proxies. Above I mentioned something more - authentication. From my past posts, you may know, that I am quite into a feature called [EasyAuth](https://docs.microsoft.com/en-us/azure/app-service/overview-authentication-authorization) (App Service Authentication / Authorization), and I am sure you know where I am going with this!

By setting it up, we can protect our Logic App with Azure AD login for example, since Azure Functions will take care of that. Alright, that's cool, but do we also get all the features of EasyAuth in Logic App? I wouldn't be writing this if we didn't, right:

```json
{
    "headers": {
        "Cache-Control": "max-age=0",
        "Connection": "Keep-Alive",
        "Accept": "text/html,application/xhtml+xml,application/xml; q=0.9,image/webp,image/apng,*/*; q=0.8,application/signed-exchange; v=b3; q=0.9",
        "Accept-Encoding": "br,gzip,deflate",
        "Accept-Language": "en-US,en; q=0.9,cs; q=0.8,ru; q=0.7",
        "Cookie": "ARRAffinity=e7b51920af4009b3c02496d96d52092422940c96fcd01492bbb6e49112bf10e4",
        "Host": "prod-26.westeurope.logic.azure.com",
        "Max-Forwards": "9",
        "Referer": "https://login.microsoftonline.com/",
        "User-Agent": "Mozilla/5.0,(Windows NT 10.0; Win64; x64),AppleWebKit/537.36,(KHTML, like Gecko),Chrome/84.0.4133.0,Safari/537.36,Edg/84.0.508.0",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
        "Sec-Fetch-Dest": "document",
        "X-WAWS-Unencoded-URL": "/api/mycustomapiget",
        "CLIENT-IP": "10.0.128.22:31811",
        "X-ARR-LOG-ID": "bd3e3584-8e76-414c-a2f8-8b12ec76523f",
        "DISGUISED-HOST": "hajekj-logicapps.azurewebsites.net",
        "X-SITE-DEPLOYMENT-ID": "hajekj-logicapps",
        "WAS-DEFAULT-HOSTNAME": "hajekj-logicapps.azurewebsites.net",
        "X-Original-URL": "/api/mycustomapiget",
        "X-Forwarded-For": "193.86.188.52:56110,193.86.188.52",
        "X-ARR-SSL": "2048|256|C=US, S=Washington, L=Redmond, O=Microsoft Corporation, OU=Microsoft IT, CN=Microsoft IT TLS CA 5|CN=*.azurewebsites.net",
        "X-Forwarded-Proto": "https",
        "X-AppService-Proto": "https",
        "X-MS-CLIENT-PRINCIPAL-NAME": "jan.hajek@thenetw.org",
        "X-MS-CLIENT-PRINCIPAL-ID": "0336b262-992a-4eaf-87c1-e0b1505cb210",
        "X-MS-CLIENT-PRINCIPAL-IDP": "aad",
        "X-MS-CLIENT-PRINCIPAL": "<principal>",
        "X-MS-TOKEN-AAD-ACCESS-TOKEN": "<access_token>",
        "X-MS-TOKEN-AAD-EXPIRES-ON": "2020-05-10T17:05:01.0000000Z",
        "X-MS-TOKEN-AAD-REFRESH-TOKEN": "<refresh_token>",
        "X-MS-TOKEN-AAD-ID-TOKEN": "<id_token>",
        "Content-Length": "0"
    }
}
```

This is the raw headers which we received from the Functions proxy into the Logic App - you can see I have my identity, I can even make use of the tokens to call some other service like Microsoft Graph from the Logic App itself!

Just for inspiration, I have already used this to build couple cool production services which I will share more info about soon.

All in all, you should be able to publish your Logic Apps as a public facing, AAD protected API! Stay tuned for more!