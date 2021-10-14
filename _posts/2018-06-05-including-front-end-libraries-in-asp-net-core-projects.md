---
title: Including front-end libraries in ASP.NET Core projects
date: 2018-06-05T09:00:05+02:00
author: Jan Hajek
permalink: /2018/06/05/including-front-end-libraries-in-asp-net-core-projects/
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - .NET
  - ASP.NET Core
  - Azure Web Apps
  - Node.js
  - NPM
---

<p>I have been recently working on an internal project which allows people to authenticate into a Wi-Fi with Azure AD and other various methods through a captive portal. While trying to maintain a strict policy on what hostnames can be accessed (basically just allowing Azure AD endpoint's and the application server) I noticed that the default ASP.NET Core project setup seems to set a bad example in handling JavaScript libraries in your project.</p>

<!--more-->

<p>Back in the days of ASP.NET Core 1.0, all frontend libraries used to be loaded by <a href="https://bower.io">Bower</a>. This was pretty nice, because it allowed you to keep all the libraries out of the project's source (by using .gitignore) and simply not commiting them.</p>

<p><em>But Honza, the default project scaffold contains only <a href="https://github.com/aspnet/templating/tree/dev/src/Microsoft.DotNet.Web.ProjectTemplates/content/RazorPagesWeb-CSharp/wwwroot/lib">4 tiny libraries</a>....</em> Yeah, but why should those be in my Git repository? Ideally, those will be loaded from an external CDN anyways. My major issue with this is, that it sets a bad example for developers. You don't include Nuget packages in your Git repository, do you? Why would you include these then?</p>

<h1>My problem</h1>

<p>When I scaffold a new project, what I always do, is remove the local files, only keep the CDN which I then replace with <a href="https://cdnjs.com/">cdnjs</a>, since using a single CDN across an entire project allows your users to fully benefit from HTTP/2 features and so on.</p>

<p>This project is unique with the fact that I don't want to use any CDNs at all. Since captive portal works by the access point/gateway restricting your access to outbound IP addresses with the exception of the captive portal itself and some other exceptions, you probably don't want to whitelist an entire CDNs namespace. That's why I want to have the libraries served from the server (not in my Git tho).</p>

<h1>Choosing the package manager</h1>

<p>Since <a href="https://bower.io/blog/2017/how-to-migrate-away-from-bower/">Bower</a> is more or less outdated and after evaluating all the other options available out there, I decided to go with <a href="https://www.npmjs.com">NPM</a>. There are multiple other alternatives out there like <a href="https://yarnpkg.com/lang/en/">Yarn</a>, but that would introduce yet another tool into the build machine (Azure App Service in my case) and onto the dev machine as well.</p>

<p>I expect a standard ASP.NET Core dev computer to contain the .NET Core SDK and Node.js with NPM - simply due to building Single Page Applications, using bundlers, Gulp, Grunt, webpack etc.</p>

<h1>Storing NPM packages</h1>

<p>Next obvious task was to decide where the NPM packages will be stored in the project structure. The most obvious place would be in the project's root (<em>/src/WebApplication1/node_modules/</em>) but that didn't turn out that good. When you decide to use another folder for static files, everything is going to work, except&nbsp;<em><a href="https://www.softfluent.com/blog/dev/Caching-static-resources-forever-with-ASP-NET-Core">asp-append-version</a></em> tag (the tiny thingy which makes frontend asset versioning super simple), which I simply wanted there, in case somebody would update the libraries. There are some <a href="https://github.com/aspnet/Mvc/issues/7459">workarounds</a>, but those are not really ideal I would say.</p>

<p>Unlike with Bower, NPM's package.json doesn't offer any option to specify, where the&nbsp;<em>node_modules</em> folder will be stored - by default and in all cases (I didn't find an option to place it elsewhere), the folder will end up in the same directory. So I put&nbsp;the&nbsp;<em>package.json</em> file into&nbsp;<em>/src/WebApplication1/wwwroot/</em> folder, gitignored the&nbsp;<em>node_modules</em> folder and added&nbsp;<em>npm install</em> into the build task:</p>

```xml
<Target Name="DebugEnsureNodeEnv" BeforeTargets="Build">
  <Message Importance="high" Text="Restoring dependencies using 'npm'. This may take several minutes..." />
  <Exec WorkingDirectory="wwwroot\" Command="npm install --no-audit" />
  <Message Importance="high" Text="Done restoring dependencies using 'npm'." />
</Target>
```

<p>On local machine, everything built correctly,&nbsp;<em>node_modules</em> downloaded, JavaScript and CSS loaded even with the versioning, the application was ready to be published into App Service (guess what, I hit another bump).</p>

<h1>dotnet publish and node_modules</h1>

<p>After I published the initial version to Azure App Service and loaded it, no CSS and JavaScript loaded. After further inspection in the filesystem through Kudu I noticed that there were no&nbsp;<em>node_modules</em> in the&nbsp;<em>D;\home\site\wwwroot\wwwroot</em> folder! Initially, I thought, hey, this must have been some bad luck, let's redeploy. I redeployed the application and indeed everything was fine.</p>

<p>Just to be sure, I decided to clean the&nbsp;<em>wwwroot</em>,&nbsp;built files in&nbsp;<em>D:\home\site\repository</em> and redeploy the application again (basically, we have a policy in our company, that the project has to build on a clean dev machine without any extra steps which then makes it super easy to put into a CI/CD pipeline, just a tip) and the same issue occured. After going through the generated build script (<em>D:\home\site\deployment\tools\build.bat</em>), I decided to run the steps manually.</p>

<p>First,&nbsp;<em>dotnet restore</em> which went fine and then&nbsp;<em>dotnet publish</em> with an output folder specified and Release configuration and whoops, the&nbsp;<em>node_modules</em> weren't part of my publish result either!</p>

<p>After spending some time on Google and GitHub issues (<a href="https://github.com/dotnet/cli/issues/4062">1</a>, <a href="https://github.com/dotnet/cli/issues/5498">2</a>, <a href="https://github.com/aspnet/websdk/issues/114">3</a>), I found out what the issue was - it seems like the .NET SDK is precalculating the files for publishing but at that time, the&nbsp;<em>node_modules</em> folder hasn't been generated yet!</p>

<p>Then it was time to figure out a fix. I remembered, that the Single Page Application (SPA) templates for ASP.NET Core must work with NPM as well, and that those packages are definitely not included in Git (since the initial project files have about 300MB). So since we live in the opensource era, I found the repo with templates on GitHub and looked at <a href="https://github.com/aspnet/templating/blob/dev/src/Microsoft.DotNet.Web.Spa.ProjectTemplates/Angular-CSharp.csproj.in">one of the <em>.csproj</em> files</a>. And there it was - the solution. Basically, through that <em>.csproj</em>, the publish process is made aware of the <em>node_modules</em> folder and includes it into the output.</p>

<h1>Solving with NPM</h1>

<p>So in the end it was all solved, I made few changes to the&nbsp;<em>.csproj</em> myself, so going to share those below, since I think they are useful:</p>

<ul><li>When running the&nbsp;<em>npm install</em> command, run it with&nbsp;<em>--no-audit</em> parameter - this speeds up the build process.</li><li>On local build, always run&nbsp;<em>npm install</em>. Since multiple people work on the project, it is quite important that everyone has the appropriate packages. This added a slight overhead to the build time, but if all packages are in sync with <em>package.json</em>, it takes only about 0.1 seconds to finish which is kind of unnoticable.</li></ul>

<p>The modifications to the&nbsp;<em>.csproj which I am using are available below:</em></p>

```xml
<Target Name="DebugEnsureNodeEnv" BeforeTargets="Build" Condition=" '$(Configuration)' == 'Debug' ">
  <!-- Ensure Node.js is installed -->
  <Message Importance="high" Text="Checking Node.js presence..." />
  <Exec Command="node --version" ContinueOnError="true">
    <Output TaskParameter="ExitCode" PropertyName="ErrorCode" />
  </Exec>
  <Error Condition="'$(ErrorCode)' != '0'" Text="Node.js is required to build and run this project. To continue, please install Node.js from https://nodejs.org/, and then restart your command prompt or IDE." />
  <Message Importance="high" Text="Restoring dependencies using 'npm'. This may take several minutes..." />
  <Exec WorkingDirectory="$(wwwroot)" Command="npm install --no-audit" />
  <Message Importance="high" Text="Done restoring dependencies using 'npm'." />
</Target>

<Target Name="PublishRunWebpack" AfterTargets="ComputeFilesToPublish">
  <!-- As part of publishing, ensure the JS resources are freshly built in production mode -->
  <Exec WorkingDirectory="$(wwwroot)" Command="npm install --no-audit" />

  <!-- Include the newly-built files in the publish output -->
  <ItemGroup>
    <DistFiles Include="$(wwwroot)node_modules\**" />
    <ResolvedFileToPublish Include="@(DistFiles->'%(FullPath)')" Exclude="@(ResolvedFileToPublish)">
      <RelativePath>%(DistFiles.Identity)</RelativePath>
      <CopyToPublishDirectory>PreserveNewest</CopyToPublishDirectory>
    </ResolvedFileToPublish>
  </ItemGroup>
</Target>
```

<h1>The real solution</h1>

<p>Just a day before this post's release, I have learned (through the GitHub issue) about a project called <a href="https://blogs.msdn.microsoft.com/webdev/2018/04/17/library-manager-client-side-content-manager-for-web-apps/">Library Manager</a>. It basically allows you to pull frontend libraries into your project - from cdnjs, local or network location. You simply specify a <em>libman.json</em> file, exclude the folder with libraries from Git and you are good to go. The build-time restore is also supported, simply by adding&nbsp;<em><a href="https://www.nuget.org/packages/Microsoft.Web.LibraryManager.Build/">Microsoft.Web.LibraryManager.Build</a>&nbsp;</em>package to your project. An example&nbsp;<em>libman.json</em> file from the project is here:</p>

```json
{
  "version": "1.0",
  "defaultProvider": "cdnjs",
  "defaultDestination": "wwwroot/lib",
  "libraries": [
    {
      "library": "jquery@3.2.1",
      "destination": "wwwroot/lib/jquery"
    },
    {
      "library": "twitter-bootstrap@3.3.7",
      "destination": "wwwroot/lib/bootstrap"
    },
    {
      "library": "jquery-validate@1.17.0",
      "destination": "wwwroot/lib/jquery-validate"
    },
    {
      "library": "jquery-validation-unobtrusive@3.2.10",
      "destination": "wwwroot/lib/jquery-validation-unobtrusive"
    }
  ]
}
```

<p><strong>Update (01SEP2018):</strong> Library Manager <a href="https://blogs.msdn.microsoft.com/webdev/2018/08/31/library-manager-release-in-15-8/">is now available</a> in Visual Studio 15.8 release! There is also a handy CLI package so you can make use of it in your terminal outside Visual Studio.</p>

<p>Currently, there is an issue <a href="https://github.com/aspnet/LibraryManager/issues/66">#66</a> which fails during build from CLI (and thus App Service as well). An easy fix is to edit the&nbsp;<em>Microsoft.Web.LibraryManager.Build.targets</em> file in your App Service directly (<em>D:\home.nuget\microsoft.web.librarymanager.build\1.0.20\build</em>) and you are good to go.</p>

<p>So go ahead and give it a try, it's easy as 1-2-3!</p>
