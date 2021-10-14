---
title: Deploying ASP.NET Core along with a WebJob to App Service
date: 2017-02-20T08:00:45+01:00
author: Jan Hajek
permalink: /2017/02/20/deploying-asp-net-core-along-with-a-webjob-to-app-service/
image: /wp-content/uploads/2017/02/WebJobs-1200x675.png
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - ASP.NET Core
  - Azure Web Apps
  - WebJobs
---

<p>Recently I have been working on a project in <a href="https://www.asp.net/core">ASP.NET Core</a> and <a href="http://www.dotvvm.com">DotVVM</a>&nbsp;accompanied by a WebJob using <a href="https://docs.microsoft.com/en-us/azure/app-service-web/websites-dotnet-webjobs-sdk">Azure WebJob SDK</a>. The idea behind publishing was that whenever I push code to the repository (VSTS in my case), App Service would pull the code, build it and deploy it automatically (this is achieved by <a href="https://docs.microsoft.com/en-us/azure/app-service-web/app-service-continuous-deployment">setting up Continuous Deployment</a>). This method works just great for ASP.NET Core application, however when accompanied by a WebJob, things weren't as smooth as I was expecting them to be.</p>

<!--more-->

<p>When you deploy a regular ASP.NET application with a WebJob,&nbsp;a special package is used in the main project (<a href="http://www.nuget.org/packages/Microsoft.Web.WebJobs.Publish/">Microsoft.Web.WebJobs.Publish</a>), which causes the WebJobs contained within the project to be built and put into their respective directories.</p>
<blockquote class="wp-block-quote"><p>In the main application's .csproj file, <a href="https://github.com/davidebbo-test/WebAppWithWebJobsVS/blob/master/WebAppWithWebJobsVS/WebAppWithWebJobsVS.csproj#L273">special targets are imported</a>&nbsp;which in combination with the <a href="https://github.com/davidebbo-test/WebAppWithWebJobsVS/blob/master/WebAppWithWebJobsVS/Properties/webjobs-list.json">configuration file</a>&nbsp;provide the necessary information for the build process to build the jobs and place them to correct WebJob directories.</p></blockquote>
<p>However this method isn't compatible with ASP.NET Core at the moment and while there is <a href="https://github.com/Azure/Azure-Functions/issues/98">work in progress</a> on enabling it to work together directly, you have to do it on your own.</p>

<h1>Brief introduction to Git publishing to App Service</h1>

<p>So what happens on the background when you deploy your code to App Service? When change is triggered and the repository is downloaded, Kudu (the engine behind App Service) tries to figure out what type of project you are deploying. It is done by various methods like checking for presence of .sln files and their content (you can look into it yourself <a href="https://github.com/projectkudu/KuduScript">here</a>). Once the project type is figured out, a build script is assembled from templates (which can be found <a href="https://github.com/projectkudu/KuduScript/tree/master/lib/templates">here</a>). That build script is then run in the downloaded project and results in successful deployment (or fail :)).</p>

<p>Sample script, which gets generated for ASP.NET Core&nbsp;project can be found below:</p>

```bat
@if "%SCM_TRACE_LEVEL%" NEQ "4" @echo off

:: ----------------------
:: KUDU Deployment Script
:: Version: 1.0.12
:: ----------------------

:: Prerequisites
:: -------------

:: Verify node.js installed
where node 2>nul >nul
IF %ERRORLEVEL% NEQ 0 (
  echo Missing node.js executable, please install node.js, if already installed make sure it can be reached from current environment.
  goto error
)

:: Setup
:: -----

setlocal enabledelayedexpansion

SET ARTIFACTS=%~dp0%..\artifacts

IF NOT DEFINED DEPLOYMENT_SOURCE (
  SET DEPLOYMENT_SOURCE=%~dp0%.
)

IF NOT DEFINED DEPLOYMENT_TARGET (
  SET DEPLOYMENT_TARGET=%ARTIFACTS%\wwwroot
)

IF NOT DEFINED NEXT_MANIFEST_PATH (
  SET NEXT_MANIFEST_PATH=%ARTIFACTS%\manifest

  IF NOT DEFINED PREVIOUS_MANIFEST_PATH (
    SET PREVIOUS_MANIFEST_PATH=%ARTIFACTS%\manifest
  )
)

IF NOT DEFINED KUDU_SYNC_CMD (
  :: Install kudu sync
  echo Installing Kudu Sync
  call npm install kudusync -g --silent
  IF !ERRORLEVEL! NEQ 0 goto error

  :: Locally just running "kuduSync" would also work
  SET KUDU_SYNC_CMD=%appdata%\npm\kuduSync.cmd
)
IF NOT DEFINED DEPLOYMENT_TEMP (
  SET DEPLOYMENT_TEMP=%temp%\___deployTemp%random%
  SET CLEAN_LOCAL_DEPLOYMENT_TEMP=true
)

IF DEFINED CLEAN_LOCAL_DEPLOYMENT_TEMP (
  IF EXIST "%DEPLOYMENT_TEMP%" rd /s /q "%DEPLOYMENT_TEMP%"
  mkdir "%DEPLOYMENT_TEMP%"
)

IF DEFINED MSBUILD_PATH goto MsbuildPathDefined
SET MSBUILD_PATH=%ProgramFiles(x86)%\MSBuild\14.0\Bin\MSBuild.exe
:MsbuildPathDefined
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:: Deployment
:: ----------

echo Handling ASP.NET Core Web Application deployment.

:: 1. Restore nuget packages
call :ExecuteCmd dotnet restore "Radius365.sln"
IF !ERRORLEVEL! NEQ 0 goto error

:: 2. Build and publish
call :ExecuteCmd dotnet publish "src\Radius365\Radius365.csproj" --output "%DEPLOYMENT_TEMP%" --configuration Release
IF !ERRORLEVEL! NEQ 0 goto error

:: 3. KuduSync
call :ExecuteCmd "%KUDU_SYNC_CMD%" -v 50 -f "%DEPLOYMENT_TEMP%" -t "%DEPLOYMENT_TARGET%" -n "%NEXT_MANIFEST_PATH%" -p "%PREVIOUS_MANIFEST_PATH%" -i ".git;.hg;.deployment;deploy.cmd"
IF !ERRORLEVEL! NEQ 0 goto error

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
goto end

:: Execute command routine that will echo out when error
:ExecuteCmd
setlocal
set _CMD_=%*
call %_CMD_%
if "%ERRORLEVEL%" NEQ "0" echo Failed exitCode=%ERRORLEVEL%, command=%_CMD_%
exit /b %ERRORLEVEL%

:error
endlocal
echo An error has occurred during web site deployment.
call :exitSetErrorLevel
call :exitFromFunction 2>nul

:exitSetErrorLevel
exit /b 1

:exitFromFunction
()

:end
endlocal
echo Finished successfully.
```

<p>Whenever you deploy a project, the generated build script is saved to&nbsp;<em>D:\home\site\deployments\tools&nbsp;</em>as&nbsp;<em>deploy.cmd</em>. From there you can download it and make modifications to it.</p>

<p>So like you probably understood from the statement above, the script can be completely customized. In order to do so, you have to let Kudu know that you will be using a custom deployment script by creating a file in the project root called&nbsp;<em>.deployment</em> and putting the following content into it (much more information about deployment scripts can be found in <a href="https://github.com/projectkudu/kudu/wiki/Custom-Deployment-Script">Kudu's docs</a>):</p>

```ini
[config]
command = deploy.cmd
```

<p>Once done, you also need to create the&nbsp;<em>deploy.cmd</em> file in the root (or specify its path). You can start with copying the contents of the pregenerated file (<em>D:\home\site\deployments\tools\deploy.cmd</em>). After that, you have to change it, so that the WebJob project gets built and put into correct folder. It is very simple and quite common sense:</p>

```bat
:: 2.1 Build and publish WebJobs
echo Building and deploying Radius365.WebJob
call :ExecuteCmd dotnet publish "src\Radius365.WebJob\Radius365.WebJob.csproj" -o "%DEPLOYMENT_TEMP%\App_Data\Jobs\Continuous\Radius365.WebJob" -c Release
IF !ERRORLEVEL! NEQ 0 goto error
```

<p>You just put this piece of code to your <em>deploy.cmd</em>, right after section&nbsp;<em>2.1 Build and publish</em>, change the paths, names and done. Next&nbsp;you can do that for every other WebJob&nbsp;you have in your project.</p>

<p>The output path&nbsp;<em>%DEPLOYMENT_TEMP%\App_Data\Jobs\Continuous\</em> applies to all cases when you are using the WebJobs SDK. If you need to deploy a triggered job, you would be using&nbsp;<em>Triggered</em> directory instead of&nbsp;<em>Continuous</em> (more info can be found in the <a href="https://github.com/projectkudu/kudu/wiki/WebJobs">docs</a>).</p>

<p>I also found it quite handy to include&nbsp;<em>run.cmd</em> script with my WebJob to make sure that the correct executable is used when the job is run or triggered instead of relying on <em>.exe</em> detection.</p>
