---
title: Creating a build agent and definition for PHP in VSTS﻿
date: 2016-10-30T12:00:54+01:00
author: Jan Hajek
permalink: /2016/10/30/creating-a-build-agent-and-definition-for-php-in-vsts/
image: /wp-content/uploads/2016/10/vsts_devops_php.png
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
  - Visual Studio Team Services
tags:
  - Composer
  - Continuous Integration
  - DevOps
  - Node.js
  - NPM
  - PHP
  - WordPress
---

<p>When speaking of modern development nowadays, we can&nbsp;hear words like DevOps and as part of that,&nbsp;Continuous Integration (if you never heard about it, you can read more about it <a href="https://www.visualstudio.com/en-us/docs/vsts-tfs-overview">here</a>). Anyways, today I am going to show you&nbsp;how to set up a build&nbsp;definition for a PHP project stored in <a href="https://www.visualstudio.com/team-services/">Visual Studio Team Services</a> and then the publication to an Azure Web App or a physical server.</p>

<!--more-->

<p>Let's take a look into what the build process can consist of: The first step, which is the same for most projects in various languages, would be to fetch the dependencies and packages. For a PHP application, this is most commonly achieved using <a href="https://getcomposer.org/">Composer</a>. If your application is front-end oriented, you may also need to download JavaScript packages from <a href="https://www.npmjs.com/">NPM</a>&nbsp;or eventually run some <a href="http://gruntjs.com/">Grunt</a> or <a href="http://gulpjs.com/">Gulp</a> tasks. After that, you might want to run the tests (because who tests their code nowadays anyways, right? :)). And&nbsp;if everything goes well, publish the built project into Artifacts so it can be accessed from VSTS and then also deploy it to your staging servers, may it be Azure Web Apps, Virtual Machine (both Windows and Linux) running on Azure, Amazon Web Services, Google Cloud&nbsp;or even on-prem!</p>

<p>So far so good, right? Assuming you have a VSTS workspace created and already have some code in there (if not, <a href="https://www.visualstudio.com/team-services/"><u><span style="color: #0066cc;">head here</span></u></a> and sign up for one!), let's take a look at how to set this up, step by step:</p>

<h1>Build Agent</h1>

<p>The core part of the build process itself is a build agent. Visual Studio Team Services offers a <a href="https://www.visualstudio.com/en-us/docs/build/admin/agents/hosted-pool">hosted build agent</a>&nbsp;which can do the job for Node.js, ASP.NET and many other projects, however it doesn't contain Composer or PHP runtime (but it contains <a href="https://www.visualstudio.com/en-us/docs/build/admin/agents/hosted-pool#software-on-the-hosted-build-server">a lot of other cool tools</a>), so we will have to go and create our own (and it isn't as hard as it sounds!).</p>

<p>Build Agent is practically a virtual machine (or a physical build&nbsp;machine)&nbsp;which receives the build task and processes the pipeline you define in the build definition.</p>

<p><strong>Update (08AUG2018):</strong> After revisiting this article, I would like to add that it is now possible to use the hosted pipelines for building PHP as well thanks to the <a href="https://docs.microsoft.com/en-us/vsts/pipelines/languages/docker?view=vsts&amp;tabs=yaml">Docker integration</a>. Simply pick or build your own PHP image which contains all the necessary things (PHP vX.X, Composer, NPM, Gulp, Grunt, etc.) and then just use it to build and publish the artifacts.</p>

<h2>Okay, virtual machine, which OS to choose?</h2>

<p>You would be usually choosing the OS type based on the environment where the application will be running. For Azure Web Apps or Windows machine, you will want to use Windows build agent, and for target environment with Linux or <a href="https://azure.microsoft.com/en-us/documentation/articles/app-service-linux-intro/">App Service on Linux</a>&nbsp;you will want to do this on Linux. Just for explanation, I believe this is the best practice because when using for example&nbsp;Node.js packages, some of the <a href="https://azure.microsoft.com/en-us/documentation/articles/nodejs-use-node-modules-azure-apps/">native packages </a>must be compiled and you just cannot take a native package built for Linux and run it on Windows. Also, and this is probably more important, when running unit tests, you want to run them in the same setup&nbsp;environment as production.</p>
<blockquote class="wp-block-quote"><p><strong><span class="mceItemHidden"><span class="mceItemHidden"><span class="hiddenSpellError">Protip</span></span>: </span></strong>Also if you are going to use Azure Virtual Machines for your build agent, you will appreciate the ability to use <a href="https://blogs.msdn.microsoft.com/peterhauge/2016/08/14/how-to-create-a-monster-build-agent-in-azure-for-cheap/">Startup and Shutdown policies with Dev/Test labs</a> to save a money when using a monster build agent (with setup where you use periodic builds). Additionally, you could make use of Azure Functions and&nbsp;set it up so the virtual machine with build agent starts when you commit to a repo and then triggers the build task after starting.</p></blockquote>
<h2>Setting it up</h2>

<p>So in my case, I will be deploying my application to a Windows-based hosting (of course it is Azure App Service, but I will also show other options). So I need to setup Windows Server. I chose a VM in Azure, but it could be just anywhere, even on my PC in Hyper-V. To create a machine in Azure, you can find the tutorial <a href="https://azure.microsoft.com/en-us/documentation/articles/virtual-machines-windows-hero-tutorial/">here</a>&nbsp;- I chose Windows Server 2016, just for the sake that I didn't get to play with it much.</p>

<p>Once my VM is up and running, you need to connect to it through the Remote Desktop and start setting up the environment:</p>

<ol><li>You may want to install PHP runtime in first place. You can achieve that using <a href="https://www.microsoft.com/web/downloads/">Web Platform Installer</a>&nbsp;or just by <a href="http://windows.php.net/download/">downloading the binaries</a>&nbsp;(or compiling your own if you are hardcore enough) and adding the folder into your PATH. I chose to install PHP 7.0 (the latest stable available atm).<br><figure><a href="/uploads/2016/10/web_platform_installer_php.png"><img class="aligncenter size-medium wp-image-122" src="/uploads/2016/10/web_platform_installer_php-300x205.png" alt="" width="300" height="205"></a></figure></li><li>Next thing you are definitely going to need is <a href="https://getcomposer.org/">Composer</a>. You can install it from the command line or using an <a href="https://getcomposer.org/Composer-Setup.exe">installer for Windows</a>&nbsp;which sets it up for you. Make sure it is available from the command line.</li><li>If you need to run tests on your code, you should also install for example <a href="https://phpunit.de/">PHPUnit</a>, it has an <a href="https://phpunit.de/manual/current/en/installation.html#installation.phar.windows">easy installation tutorial</a>.</li><li>You also need to have&nbsp;<a href="http://nodejs.org/">Node.js</a> runtime installed. This is because of two reasons: if you ever need NPM or run some Tasks for your code, it will come in handy and secondly because the VSTS build tasks are written in Node.js (cool, right?).</li><li>If you plan to deploy into Azure Web Apps, installing <a href="https://www.iis.net/downloads/microsoft/web-deploy">Web Deploy</a> might come in handy.</li><li>The last step would be to setup the build agent connection. Microsoft's docs have a great tutorial on how to do this on <a href="https://www.visualstudio.com/en-us/docs/build/admin/agents/v2-windows">Windows</a>, <a href="https://www.visualstudio.com/en-us/docs/build/admin/agents/v2-linux">Linux</a> and <a href="https://www.visualstudio.com/en-us/docs/build/admin/agents/v2-osx">Mac</a>.</li></ol>

<p>Upon successful configuration, the agent will appear in the Agent pools section of VSTS like so:</p>
<div class="wp-block-image"><figure class="aligncenter"><a href="/uploads/2016/10/vsts_agent.png"><img src="/uploads/2016/10/vsts_agent-300x163.png" alt="" class="wp-image-123"/></a></figure></div>
<p>Since the VSTS agent doesn't automatically detect PHP and Composer, it is also useful to add it into <a href="https://www.visualstudio.com/en-us/docs/release/getting-started/configure-agents#agent-capabilities">capabilities</a>, so if you have multiple build agents, in a pool, it will be easier to run the build task only on a pool of agents which have PHP and Composer or PHP7 etc.</p>
<div class="wp-block-image"><figure class="aligncenter"><a href="/uploads/2016/10/vsts_agent_capabilities.png"><img src="/uploads/2016/10/vsts_agent_capabilities-300x82.png" alt="" class="wp-image-124"/></a></figure></div>
<p>So now we have the build agent setup, lets move onto creating the Build Definition.</p>

<h1>Build Definition</h1>

<p><a href="https://www.visualstudio.com/en-us/docs/build/define/create">Build definition</a> defines the build process step-by-step. We are going to start from an empty definition. VSTS contains a lot of very useful <a href="https://www.visualstudio.com/en-us/docs/build/define/build">predefined steps</a> which we are going to make use of.</p>

<p>VSTS is automatically going to automatically&nbsp;create a temporary project folder, where the code is going to be pulled (and do it on every build), so the first thing we need to do is to get the packages from Composer.</p>

<h2>Composer</h2>

<p>Since there is no such thing predefined in the default steps or the marketplace, we will need to create our own script. On Windows, I really like PowerShell, so I created a new PowerShell step:</p>
<div class="wp-block-image"><figure class="aligncenter"><a href="/uploads/2016/10/vsts_build_task_ps.png"><img src="/uploads/2016/10/vsts_build_task_ps-292x300.png" alt="" class="wp-image-130"/></a></figure></div>
<p>And then add the code to be executed. Make sure it is set as <strong>Inline Script</strong>, which will allow you to write it directly in the build step. The contents of the script will be like so:</p>

```powershell
# You can write your powershell scripts inline here. 
# You can also pass predefined and custom variables to this scripts using arguments

composer install
```

<p>Next, you need to tweak the script settings a bit - since Composer seems to be sending debug messages to stderr (for example <a href="https://github.com/composer/composer/issues/4034">#4034</a>) and it seems to be expected behavior, you have to uncheck <strong>Fail on standard error</strong> option in the Advanced section, else your build will constantly fail. No worries, if an actual error happens, like a package fails to download, the build task will fail, because Composer will exit with an error code.</p>
<div class="wp-block-image"><figure class="aligncenter"><a href="/uploads/2016/10/vsts_build_task_ps_cfg.png"><img src="/uploads/2016/10/vsts_build_task_ps_cfg-300x183.png" alt="" class="wp-image-131"/></a></figure></div>
<p>Now the project will contain the packages from Composer, we could do similar for <a href="https://www.visualstudio.com/en-us/docs/build/steps/package/npm-install">fetching NPM packages</a> or running <a href="https://www.visualstudio.com/en-us/docs/build/steps/build/grunt">Grunt</a> tasks with the difference that these tasks are already created and you don't have to execute them manually.</p>

<p>Next up, running tests.</p>

<h2>PHPUnit</h2>

<p>Once again, <a href="https://phpunit.de/">PHPUnit</a> doesn't have predefined&nbsp;tasks either, so we have to manually execute it using command line. I actually discovered few issues with PHPUnit's test results, but I will explain it throughout this part.</p>

<p>Anyways, once again we need to create a new command line task which will be an inline script. I will paste the contents below and explain it afterwards:</p>

```powershell
phpunit

try {
    $XslPatht = New-Object System.Xml.Xsl.XslCompiledTransform
    $XslPatht.Load("Test/phpunit2junit.xsl")
    $XslPatht.Transform("Test/Logs/junit.xml", "Test/Logs/junit-fixed.xml")
}
catch {
    Write-Host $_.Exception -ForegroundColor Red
}
```

<p>Alrighty, so first off we simply run <em>phpunit</em> command. For it to run successfully, you need to have a <em>phpunit.xml</em> definition existing in the project root. Example of such definition would be:</p>

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="https://schema.phpunit.de/5.2/phpunit.xsd"
         backupGlobals="false"
         backupStaticAttributes="false"
         beStrictAboutCoversAnnotation="true"
         beStrictAboutOutputDuringTests="true"
         beStrictAboutTestsThatDoNotTestAnything="true"
         beStrictAboutTodoAnnotatedTests="true"
         forceCoversAnnotation="true"
         verbose="true">
    <logging>
        <log type="junit" target="Test/Logs/junit.xml"/>
    </logging>
    <testsuite name="Sample">
        <directory suffix="Test.php">Test</directory>
    </testsuite>
</phpunit>
```

<p>This is going to tell PHPUnit to run all tests within <em>Test</em> directory and store the results into <a href="http://junit.org/junit4/">JUnit</a> compatible xml file. However as it turns out, PHPUnit's JUnit compatible file isn't really JUnit compatible (funny, right?). Hence the second part of the PowerShell script, which transforms the PHPUnit generated XML into JUnit compatible XML (you can read more about it <a href="https://youtrack.jetbrains.com/issue/TW-17249">here</a> or <a href="https://cweiske.de/tagebuch/visualizing-phpunit-runs.htm">here</a>). In order to transform the PHPUnit file we need to create an <a href="https://en.wikipedia.org/wiki/XSLT">XSL Transform file</a>&nbsp;with following contents:</p>

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:template match="/">
    <xsl:element name="testsuites">
        <xsl:for-each select="//testsuite[@file]">
                 <xsl:copy-of select="." />
        </xsl:for-each>
    </xsl:element>
</xsl:template>
</xsl:stylesheet>
```

<p>I chose to store it into Test folder under phpunit2junit.xsl name.</p>

<p>Once this is set up, all you have to do is to create a Task which will collect and upload the test results to VSTS. From the task selection we add <em>Publish Test Results</em> task (can be found under Test category). And we configure it for the <em>JUnit</em> test format and give it the path of where the file will be stored (in my case it was <em>Test\Logs\junit-fixed.xml</em>).</p>

<p>Now we have the PHPUnit configured and test results&nbsp;are going to show up in VSTS with each build. Thanks to it, we could also choose to automatically create bugs whenever a test fails and so on.</p>

<h2><figure><a href="/uploads/2016/10/vsts_test_result.png"><img class="aligncenter size-medium wp-image-135" src="/uploads/2016/10/vsts_test_result-300x161.png" alt="" width="300" height="161"></a></figure>Publishing</h2>

<p>The last part is to publish the project. In this case, we are going to publish the artifacts to VSTS first and then publish the project to our server.</p>
<h3>Publishing artifacts</h3>

<p>This step is optional, what it does is that it takes the built project and publishes it to VSTS or some sort of share. You would for example configure this so your built project is available from the VSTS to QA team who may want to deploy it manually or so. You would also use these to store some extra logs, screenshots or any other files in general.</p>
<h3>Publishing to Azure Web App</h3>

<p>In order to publish the project into App Service, all you have to do is to add the build task called <em>Deploy AzureRM App Service</em>, connect it to your Azure Subscription, choose the website to deploy to, optionally a deployment slot and you are good to go!</p>

<h1><figure><a href="/uploads/2016/10/vsts_build_task_azurewa_v2.png"><img class="aligncenter size-medium wp-image-138" src="/uploads/2016/10/vsts_build_task_azurewa_v2-300x199.png" alt="" width="300" height="199"></a></figure>Wrap-up</h1>

<p>So now we have setup a basic DevOps cycle with deployment to Azure Web Apps using VSTS, ain't it cool? Additionally, you could just choose to deploy the application to an IIS enabled server like a VM or an on-prem one, or deploy your project on a Linux server using SSH file copy! The great thing is that these build tasks are already ready for you!</p>

<p>Another practical use could be building <a href="https://codex.wordpress.org/Writing_a_Plugin">WordPress plugins</a>. Especially the packaging and publishing part can be pain in some cases - like when using Composer packages in your plugin. Eventually, the entire <a href="https://wordpress.org/plugins/about/svn/">Subversion part</a> of publishing could be just hidden into one of the build tasks.</p>

<h2>VSTS vs. App Service custom deployment</h2>

<p>You might have heard that Azure App Service already supports customizable deployment by using your own <a href="https://github.com/projectkudu/kudu/wiki/Custom-Deployment-Script">deployment scripts</a>, which are also really powerful and do the job for very simple applications (even the <a href="https://azure.microsoft.com/en-us/documentation/articles/web-sites-php-configure/#how-to-enable-composer-automation-in-azure">Composer extension</a> leverages it). But say, you need to run the unit tests or you would like to use Composer with App Service on Linux - VSTS is your best friend. And thanks to the ability to have a custom build agent, you can chain any tool into the build process.</p>

<h2>Marketplace extension</h2>

<p>I am actually thinking about making an extension for Composer into the <a href="https://marketplace.visualstudio.com/vsts">VSTS Marketplace</a>&nbsp;which would remove the need of creating a custom build agent (at least for Windows).</p>

<p><strong>Update:</strong> I found that someone has already <a href="https://github.com/incarnate/vsts-php-tools">built an extension for VSTS</a>, however it is not listed on the <a href="https://marketplace.visualstudio.com/vsts">Marketplace</a> and I haven't tested it yet.</p>
