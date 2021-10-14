---
title: Deploying PHP web applications to Azure App Service
date: 2017-04-20T08:45:50+02:00
author: Jan Hajek
permalink: /2017/04/20/deploying-php-web-applications-to-azure-app-service/
image: /wp-content/uploads/2017/04/php.jpg
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - App Service on Linux
  - Azure Web Apps
  - Composer
  - Kudu
  - PHP
---

<p>In this article we are going to take a look at options on how to deploy a standard PHP application to Azure App Service. This article is split into two parts - classical App Service running Windows and the new Docker-based App Service on Linux which recently got some really nice improvements towards PHP support.</p>

<!--more-->

<p>I would consider standard PHP application to consist of source files and also Composer packages. A while ago, I opened up an <a href="https://github.com/projectkudu/KuduScript/issues/68">issue in Kudu related repository</a> to actually add a better support for PHP based application deployment. It resulted with having an example deployment script added to the repository and a more automated build process added to App Service on Linux. We are going to explore the current options for deploying PHP applications using these options to App Service and App Service on Linux.</p>

<h1>App Service</h1>

<p>We are going to start off with looking at classic Azure App Service powered by Windows machines. There you have two options - you can either install the <a href="https://www.siteextensions.net/packages/ComposerExtension/">Composer extension</a> or <a href="https://github.com/projectkudu/kudu/wiki/Custom-Deployment-Script">deploy using custom deployment script</a>&nbsp;- each has its ups and downs:</p>

<h2>Composer extension</h2>

<p>The extension itself is very easy to deploy, you simply add it from the Azure Portal. After that, whenever you push new code to the repository and deployment is started, it is going to download the packages as part of the deployment, additionally&nbsp;<em>composer</em>&nbsp;executable will be added to the PATH so it can be very easily called from the Command Line or PowerShell in Kudu.</p>
<div class="wp-block-image"><figure class="aligncenter"><a href="/uploads/2017/04/composer_extension.png"><img src="/uploads/2017/04/composer_extension-300x290.png" alt="" class="wp-image-282"/></a></figure></div>
<p>The great thing about the extension is that it is open source and available <a href="https://github.com/SyntaxC4-MSFT/ComposerExtension">on GitHub</a>, so you can see exactly what is it doing on the background.</p>
<h3>FYI: How the extension works</h3>

<p>The extension basically downloads latest Composer, automatically forces its own <a href="https://github.com/SyntaxC4-MSFT/ComposerExtension/blob/master/Content/Hooks/deploy.cmd">deployment script</a>&nbsp;which handles the installation and additionally, it transforms the PATH using <a href="https://github.com/SyntaxC4-MSFT/ComposerExtension/blob/master/Content/applicationHost.xdt"><em>applicationHost.xdt</em></a> to contain the executable so Composer can be called directly from Command Line or PowerShell in Kudu.</p>

<h2>Custom deployment script</h2>

<p>The custom deployment script gives you a little bit more freedom on how to customize the build process itself. Kudu offers a lot of nice&nbsp;pre-configured build tasks which get applied automatically whenever the specific project type is detected, however PHP is not very likely going to be supported automatically in App Service on Windows (<a href="https://github.com/projectkudu/KuduScript/issues/68#issuecomment-294979059">#68</a>). In this case, Kudu offers a <a href="https://github.com/projectkudu/kudu-deployment-scripts">repository with pre-made deployment scripts</a> which you can just ship with your code.</p>

<p>One of those scripts is a <a href="https://github.com/projectkudu/kudu-deployment-scripts/blob/master/scripts/deploy-php.cmd">PHP deployment script</a>. This script is very similar in behavior with the Composer extension, however it doesn't modify the PATH itself and simply downloads latest version of Composer during the build process (unless downloaded before), downloads the packages and copies the content over to the&nbsp;<em>DEPLOYMENT_TARGET</em> folder (which is usually&nbsp;<em>D:\home\site\wwwroot</em>).</p>

<p>With this script, you can do additional modifications like run&nbsp;Bower or NPM directly in the Batch scripts, so you have a little bit more control over the build process.</p>

<p>The most important part of the deployment script is:</p>

```bat
:: 1. Composer.phar
IF EXIST "%DEPLOYMENT_SOURCE%\composer.json" (
  cd %DEPLOYMENT_SOURCE%

  IF NOT EXIST "%DEPLOYMENT_SOURCE%\composer.phar" (
    echo Composer.phar not found. Downloading...
    call curl -s https://getcomposer.org/installer | php
    IF !ERRORLEVEL! NEQ 0 goto error
  ) ELSE (
      echo Attempting to update composer.phar
      php composer.phar self-update
  )
  
  call php composer.phar install --no-dev
  IF !ERRORLEVEL! NEQ 0 goto error
)
```

<blockquote class="wp-block-quote"><p>Just like .csproj with C#, Composer allows to execute custom scripts or commands on certain events (<a href="https://getcomposer.org/doc/articles/scripts.md">more info</a>). This allows you to fully integrate tasks like NPM, Bower install, Gulp tasks and so on directly into the composer.json file, so it is ran whenever composer install is executed. This is similar way how .NET Core and especially ASP.NET Core handles such things (more <a href="https://docs.microsoft.com/en-us/dotnet/articles/core/tools/project-json-to-csproj#scripts">here</a>).</p></blockquote>
<h1>App Service on Linux</h1>

<p>I have already blogged about App Service on Linux <a href="https://hajekj.net/2016/12/25/building-custom-docker-images-for-use-in-app-service-on-linux/">multiple times</a>, now we are going to focus on deploying a PHP application there. Again, just like with App Service on Windows, there are multiple ways to achieve the deployment.</p>

<h2>Building custom Docker container</h2>

<p>One of the ways is to build a custom Docker container which would contain the built application already and you would just deploy it to App Service on Linux. We explored this option in a previous article about <a href="https://hajekj.net/2016/12/25/building-custom-docker-images-for-use-in-app-service-on-linux/">building your custom container for ASL</a>, and with slight modifications, you could also <a href="https://hajekj.net/2016/10/30/creating-a-build-agent-and-definition-for-php-in-vsts/">leverage VSTS and automate the Composer tasks</a> into the container build process as well.</p>

<h2>Deploying directly to ASL</h2>

<p>When you create a new App Service on Linux, you can choose from pre-defined runtime containers - for example PHP7. However when you push the code to repository and it gets deployed to ASL, the PHP7 container is not going to be the container where the application gets built. It is actually going to be built in the Kudu container.</p>

<p>Like I mentioned already above - the team behind ASL has done <a href="https://github.com/projectkudu/KuduScript/commit/5166d4f19d598b3f4f00078a7dca9f50c9ecf4be">a lot of great work</a> towards adding better out-of-box support for PHP there. Thanks to that, when a deployment script is to be generated for ASL deployment, amongst the other runtimes, it also tries to check if it is a PHP project and if so, it will generate a <a href="https://github.com/projectkudu/KuduScript/blob/5166d4f19d598b3f4f00078a7dca9f50c9ecf4be/lib/templates/deploy.bash.php.template">Bash script</a> which handles the deployment.</p>

<p>Just like with App Service on Windows, you can take the generated Bash script and modify it to your needs - add custom commands to execute on build and so on (you can achieve the same by using <em>scripts</em> in <em>composer.json</em> just like mentioned above with App Service on Windows).</p>

<p>The latest version of Kudu container comes already with <a href="https://github.com/Azure-App-Service/kudu/blob/master/1.4/Dockerfile#L261">Composer installed</a>, so&nbsp;it is very easy and straightforward to go on with such deployment.</p>

<h1>App Service or App Service on Linux?</h1>

<p>The ultimate question - should I go with App Service on Windows or App Service on Linux for my application? The answer I can give you at the moment is not as straightforward, but let's simply go&nbsp;with facts:</p>

<ul><li><strong>App Service on Linux is still in Preview</strong> which means it shouldn't be used for production workloads since breaking changes can still be made and could affect your application.</li><li>App Service on Windows offers more features at the moment - like extensions, WebJobs, more Kudu options and so on.</li><li>App Service on Linux is more native for PHP and other OSS runtimes.</li><li>App Service on Windows is a stable and proven platform - it works really good (from my experience) when running PHP workloads.</li></ul>

<p>So if you are just playing around - I would go with App Service on Linux. If you are doing production things with need for SLAs and such - I would go with App Service on Windows at the moment.</p>

<p>From the <a href="https://github.com/projectkudu/KuduScript/issues/68#issuecomment-294979059">GitHub issue's discussion</a> it is clear that a lot of effort is being put into improving PHP, Node.js and other OSS's runtimes developer experience on Azure thanks to App Service on Linux, so it is probably the best place to look into.</p>
