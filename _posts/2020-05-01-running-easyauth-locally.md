---
title: Running EasyAuth locally
date: 2020-05-01T09:00:00+02:00
author: Jan Hajek
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - Azure Web Apps
  - Azure Functions
  - App Service on Linux
  - EasyAuth
  - Docker
  - SSO
---

Azure App Service has a cool feature which enables your web apps to leverage authentication and authorization without any code changes. It is actually very powerful functionality and in future posts, I will spend some more time digging into it. In this post, I will show you how you can make use of this feature when developing your solutions locally.

This feature is called *Authentication / Authorization* in the Azure Portal, internally, Microsoft calls it [*EasyAuth*](https://github.com/cgillum/easyauth), and [some docs](https://docs.microsoft.com/en-us/azure/app-service/app-service-authentication-how-to) refer to it as *AuthN/AuthO*. I will stick to Easy Auth.

So why would you want to run it locally in first place? Imagine, you are building an Azure Function for example and you rely on some information parsed from the token by Easy Auth. While you can partially mock it by sending the [`X-MS-*`](https://docs.microsoft.com/en-us/azure/app-service/app-service-authentication-how-to#access-user-claims) headers it can be quite challenging, especially if you need the access token for example.

About a year ago I published an article about [`appsvc/middleware` Docker image](/2019/01/21/exploring-app-service-authentication-on-linux/)... by now you should probably know where this is heading - we are going to use this official image to run Easy Auth locally in Docker and act as an [ambassador](https://docs.microsoft.com/en-us/azure/architecture/patterns/ambassador) in front of our Function emulator (or whatever else you want to have there).

First off, make sure you have [Docker installed](https://www.hanselman.com/blog/HowToSetUpDockerWithinWindowsSystemForLinuxWSL2OnWindows10.aspx) - Scott made a very nice tutorial for it. Also make sure to have [Azure Functions setup locally](https://docs.microsoft.com/en-us/azure/azure-functions/functions-develop-local) (I like using the Visual Studio setup, but obviously, use whatever makes you happy).

We are going to start off by pulling the [image from Docker Hub](https://hub.docker.com/r/appsvc/middleware):

```bash
docker pull appsvc/middleware:2001061754
```

Once it completes, we need to start the container. In order to do that, we need to provide it proper environment variables. We are going to start by looking at the container logs which actually contain the basic configuration details:

```bash
docker run -d -p 6219:8081 --name hajekj-asl-auth_0_7acbe16b_middleware -e WEBSITE_SITE_NAME=hajekj-asl-auth -e WEBSITE_AUTH_ENABLED=True -e WEBSITE_ROLE_INSTANCE_ID=0 -e WEBSITE_HOSTNAME=hajekj-asl-auth.azurewebsites.net -e WEBSITE_INSTANCE_ID=07f9cf5840a21c88ad9faf3878ff016f7bcbae6c77a45c73e38dd7fa16d576c6 -e HTTP_LOGGING_ENABLED=1 appsvc/middleware:2001061754 /Host.ListenUrl=http://0.0.0.0:8081 /Host.DestinationHostUrl=http://172.16.3.4:8080 /Host.UseFileLogging=true 
```

Since it is the real deal which runs in App Service as well, all we need to do is setup a dummy site in App Service (on Linux preferably), configure Easy Auth there and look at the configuration set in Environment Variables. I did this for you, so the entire configuration can be found below:

```ini
APPDATA = /opt/Kudu/local
APPSETTING_REMOTEDEBUGGINGVERSION = 11.0.611103.400
APPSETTING_SCM_USE_LIBGIT2SHARP_REPOSITORY = 0
APPSETTING_ScmType = None
APPSETTING_WEBSITE_AUTH_ALLOWED_AUDIENCES = https://hajekj-asl-auth.azurewebsites.net/.auth/login/aad/callback
APPSETTING_WEBSITE_AUTH_AUTO_AAD = False
APPSETTING_WEBSITE_AUTH_CLIENT_ID = b963e9b6-134e-4c2e-a049-4d27fc9b33f3
APPSETTING_WEBSITE_AUTH_CLIENT_SECRET = HIDDEN
APPSETTING_WEBSITE_AUTH_DEFAULT_PROVIDER = AzureActiveDirectory
APPSETTING_WEBSITE_AUTH_ENABLED = True
APPSETTING_WEBSITE_AUTH_LOGOUT_PATH = /.auth/logout
APPSETTING_WEBSITE_AUTH_OPENID_ISSUER = https://sts.windows.net/40c29545-8bca-4f51-8689-48e6819200d2/
APPSETTING_WEBSITE_AUTH_TOKEN_STORE = True
APPSETTING_WEBSITE_AUTH_UNAUTHENTICATED_ACTION = RedirectToLoginPage
APPSETTING_WEBSITE_SITE_NAME = hajekj-asl-auth
APPSVC_RUN_ZIP = FALSE
ASPNETCORE_URLS = http://0.0.0.0:8181
COMPUTERNAME = SmallDedicatedLinuxWebWorkerRoleIN43
DEBIAN_FRONTEND = noninteractive
DOTNET_CLI_TELEMETRY_PROFILE = AzureKudu
DOTNET_RUNNING_IN_CONTAINER = true
DOTNET_SKIP_FIRST_TIME_EXPERIENCE = 1
DOTNET_USE_POLLING_FILE_WATCHER = true
ENABLE_ORYX_BUILD = true
FRAMEWORK = PHP
FRAMEWORK_VERSION = 7.2
HOME = /home
HOSTNAME = f447f2887d21
HTTP_AUTHORITY = hajekj-asl-auth.scm.azurewebsites.net
HTTP_HOST = hajekj-asl-auth.scm.azurewebsites.net
KUDU_APPPATH = /opt/Kudu
KUDU_RUN_USER = 73d289257117fb5c128fd85a
KUDU_WEBSSH_PORT = 3000
LANG = C.UTF-8
NOKOGIRI_USE_SYSTEM_LIBRARIES = true
NUGET_PACKAGES = /var/nuget
NUGET_XMLDOC_MODE = skip
OLDPWD = /
ORYX_AI_INSTRUMENTATION_KEY = 4aadba6b-30c8-42db-9b93-024d5c62b887
ORYX_ENV_NAME = ~1hajekj-asl-auth
ORYX_ENV_TYPE = AppService
PATH = /home/site/deployments/tools:/opt/Kudu/Scripts:/usr/bin:/usr/bin:/usr/local/bin:/usr/local/bin:/usr/local/bin:/usr/local/bin:/usr/local/.rbenv/bin:/usr/local:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/opt/dotnet/sdks/2.2.402:/opt/php/7.2/bin:/opt/oryx:/opt/nodejs/lts/bin:/opt/dotnet/sdks/lts:/opt/python/latest/bin:/opt/yarn/stable/bin:/opt/php/lts/bin:/root/.dotnet/tools:/opt/nodejs/9/bin
PHP_VERSION = 7.2
PLATFORM_VERSION = 87.0.7.64
PORT = 8181
PWD = /opt/Kudu
PYTHONIOENCODING = UTF-8
RBENV_ROOT = /usr/local/.rbenv
REMOTEDEBUGGINGVERSION = 11.0.611103.400
RUBY_CFLAGS = -O3
RUBY_CONFIGURE_OPTS = --disable-install-doc
SHLVL = 1
SITE_BITNESS = AMD64
ScmType = None
WEBSITE_AUTH_ALLOWED_AUDIENCES = https://hajekj-asl-auth.azurewebsites.net/.auth/login/aad/callback
WEBSITE_AUTH_AUTO_AAD = False
WEBSITE_AUTH_CLIENT_ID = b963e9b6-134e-4c2e-a049-4d27fc9b33f3
WEBSITE_AUTH_CLIENT_SECRET = HIDDEN
WEBSITE_AUTH_DEFAULT_PROVIDER = AzureActiveDirectory
WEBSITE_AUTH_ENABLED = True
WEBSITE_AUTH_ENCRYPTION_KEY = HIDDEN
WEBSITE_AUTH_LOGOUT_PATH = /.auth/logout
WEBSITE_AUTH_OPENID_ISSUER = https://sts.windows.net/40c29545-8bca-4f51-8689-48e6819200d2/
WEBSITE_AUTH_SIGNING_KEY = HIDDEN
WEBSITE_AUTH_TOKEN_STORE = True
WEBSITE_AUTH_UNAUTHENTICATED_ACTION = RedirectToLoginPage
WEBSITE_HOSTNAME = hajekj-asl-auth.azurewebsites.net
WEBSITE_INSTANCE_ID = 07f9cf5840a21c88ad9faf3878ff016f7bcbae6c77a45c73e38dd7fa16d576c6
WEBSITE_OWNER_NAME = 63dd3a98-6ad8-47ae-ae7f-568e9b3104a8+AppServiceOnLinux-WestEuropewebspace
WEBSITE_PHP_VERSION = 7.2
WEBSITE_RESOURCE_GROUP = appserviceonlinux
WEBSITE_ROLE_INSTANCE_ID = 0
WEBSITE_SITE_NAME = hajekj-asl-auth
dotnet = /opt/dotnet/sdks/2.2.402/dotnet
php = /opt/php/7.2/bin/php
```

From all these variables, we only need the following:

```ini
HOME = /home
WEBSITE_AUTH_ALLOWED_AUDIENCES = https://hajekj-asl-auth.azurewebsites.net/.auth/login/aad/callback
WEBSITE_AUTH_AUTO_AAD = False
WEBSITE_AUTH_CLIENT_ID = b963e9b6-134e-4c2e-a049-4d27fc9b33f3
WEBSITE_AUTH_CLIENT_SECRET = HIDDEN
WEBSITE_AUTH_DEFAULT_PROVIDER = AzureActiveDirectory
WEBSITE_AUTH_ENABLED = True
WEBSITE_AUTH_ENCRYPTION_KEY = HIDDEN
WEBSITE_AUTH_LOGOUT_PATH = /.auth/logout
WEBSITE_AUTH_OPENID_ISSUER = https://sts.windows.net/40c29545-8bca-4f51-8689-48e6819200d2/
WEBSITE_AUTH_SIGNING_KEY = HIDDEN
WEBSITE_AUTH_TOKEN_STORE = True
WEBSITE_AUTH_UNAUTHENTICATED_ACTION = RedirectToLoginPage
```

Please note, that the `HIDDEN` values need to be properly specified, so either generate them or use the ones generated by App Service for you. Now we need to pass all these variables into the `docker run` command in order for the container to start, and also give it the proper `Host.DestinationHostUrl` so it knows where to proxy the requests:

```bash
docker run -d -p 8081:8081 --name middleware -e WEBSITE_SITE_NAME=localhost -e WEBSITE_AUTH_ENABLED=True -e WEBSITE_ROLE_INSTANCE_ID=0 -e WEBSITE_HOSTNAME=localhost -e WEBSITE_INSTANCE_ID=localhost -e HTTP_LOGGING_ENABLED=1 -e WEBSITE_AUTH_ALLOWED_AUDIENCES=http://localhost:8081/.auth/login/aad/callback -e WEBSITE_AUTH_AUTO_AAD=False -e WEBSITE_AUTH_CLIENT_ID=b963e9b6-134e-4c2e-a049-4d27fc9b33f3 -e WEBSITE_AUTH_CLIENT_SECRET=HIDDEN -e WEBSITE_AUTH_DEFAULT_PROVIDER=AzureActiveDirectory -e WEBSITE_AUTH_ENABLED=True -e WEBSITE_AUTH_ENCRYPTION_KEY=HIDDEN -e WEBSITE_AUTH_LOGOUT_PATH=/.auth/logout -e WEBSITE_AUTH_OPENID_ISSUER=https://sts.windows.net/40c29545-8bca-4f51-8689-48e6819200d2/ -e WEBSITE_AUTH_SIGNING_KEY=HIDDEN -e WEBSITE_AUTH_TOKEN_STORE=True -e WEBSITE_AUTH_UNAUTHENTICATED_ACTION=RedirectToLoginPage -e HOME=/home appsvc/middleware:2001061754 /Host.ListenUrl=http://0.0.0.0:8081 /Host.DestinationHostUrl=http://192.168.1.100:7071 /Host.UseFileLogging=true
```

Make sure to replace the values with your own. Also don't forget to add the proper Redirect URL to your app's registration in Azure AD. Next about the `Host.DestinationHostUrl`. The URL should be your computer's IP address along with the appropriate port where the Functions runtime is running - for me it was `192.168.1.100` - but this address changes depending on your network.

After starting the container, your site should be available at `http://localhost:8081` (you can change this in the command above).

![Headers being passed from Easy Auth to Azure Functions in Visual Studio](/uploads/2020/05/easyauth-headers-vs.jpg)

![Calling me and refresh endpoints via fetch from JavaScript](/uploads/2020/05/easyauth-refresh-me.jpg)

As you can see on the images above, headers are correctly passed to your code and you can even leverage the AJAX endpoints from the browser directly. There you go, a fully working Easy Auth running locally along with Azure Functions or any of your locally running sites!

# Footnotes
If you need to access the container's logs, you can do so by entering it and checking `/var/middleware/logs/middleware.log`. The tokens are stored at `/home/data/.auth/tokens/`, you can use [volume mounting](https://docs.docker.com/storage/volumes/) to access the tokens if needed.

Honestly I am looking forward what else I can make happen with Easy Auth!