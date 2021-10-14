---
title: Remotely debugging PHP on App Service on Linux
date: 2018-05-29T09:00:09+02:00
author: Jan Hajek
permalink: /2018/05/29/remotely-debugging-php-on-app-service-on-linux/
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
  - Visual Studio Code
tags:
  - App Service on Linux
  - Debugging
  - Docker
  - PHP
  - SSH
---

<p>I previously wrote about the possibility of <a href="https://hajekj.net/2016/09/06/remotely-debugging-php-on-azure-web-apps-with-ngrok/">remote debugging PHP apps in Microsoft Azure using ngrok</a>. This solution wasn't much secure and required the use of 3rd party software. During build, <a href="https://docs.microsoft.com/en-us/azure/app-service/containers/app-service-linux-ssh-support">Microsoft announced support for SSH directly into the App Service on Linux instance</a>&nbsp;and thanks to that, we no longer need ngrok or similar software and can do with just Azure CLI and VS Code. In this article, we are going to look at the setup.</p>

<!--more-->

<p>The only thing you need is to have <a href="https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest">Azure CLI installed</a> on your machine and an SSH client. My setup is fairly simple, I have the <a href="https://docs.microsoft.com/en-us/windows/wsl/install-win10">Ubuntu Bash on Windows installed</a>, where I have both Azure CLI and SSH client. You could alternatively <a href="https://blogs.msdn.microsoft.com/commandline/2018/01/22/openssh-in-windows-10/">install SSH client to Windows directly</a> along with Azure CLI.</p>

<p>Since this functionality is still in preview at the time of writing, you need to install the&nbsp;<em>webapp</em> extension into the CLI first.</p>

```bash
az extension add -–name webapp
```

<p>You also need to be using App Service on Linux with a proper container. The default PHP runtime containers don't contain Xdebug, however the GitHub and <a href="https://hub.docker.com/r/appsvc/php/tags/">Docker Hub</a> has got you covered, so simply use the custom Docker image (don't forget to <a href="https://docs.microsoft.com/en-us/azure/app-service/containers/app-service-linux-faq#custom-containers">enable persistent storage mount</a>).</p>

<p>Next, you need to open the tunnel to the Kudu instance which is then going to proxy the communication to the web instance. Just FYI, the tunnel seems to be simple websocket (wss://) connection (see the <a href="https://github.com/Azure-App-Service/kudu/blob/master/kudu/TunnelExtension.zip">TunnelExtension.zip</a> if you want to learn how it works behind the scenes on server and <a href="https://github.com/Azure/azure-cli-extensions/blob/2eda2edac1b472f8d8980c8ed645feb8452e5a71/src/webapp/azext_webapp/tunnel.py">Tunnel.py</a> on the client, alternatively <a href="https://github.com/Microsoft/vscode-azuretools/blob/master/appservice/src/TunnelProxy.ts">TunnelProxy.ts</a> in VS Code used for <a href="https://medium.com/@auchenberg/introducing-remote-debugging-of-node-js-apps-on-azure-app-service-from-vs-code-in-public-preview-9b8d83a6e1f0">Node.js remote debugging</a>). To open the tunnel, simply execute following command:</p>

```bash
az webapp remote-connection create --resource-group <group_name> -n <app_name> -p <port>
```

<p>The port is optional but it allows you to specify the local port used for the tunnel. Once you execute it, the tunnel is going to be open until you end the process.</p>

<p>Then you should try connecting to the instance by SSH like so (the port in this case is the one that you either chose or&nbsp; was generated for you after executing the command above):</p>

```bash
ssh root@127.0.0.1 -p <port>
```

<p>The password for the connection is&nbsp;<em>Docker!</em> (in case you are using custom image, follow <a href="https://docs.microsoft.com/en-us/azure/app-service/containers/tutorial-custom-docker-image#connect-to-web-app-for-containers-using-ssh">these instructions to setup SSH</a>). Once you successfully connect, feel free to terminate the session, since in order to be able to remotely debug PHP, we need to configure <a href="https://help.ubuntu.com/community/SSH/OpenSSH/PortForwarding">SSH port forwarding</a>.</p>

<p>Port forwarding basically allows you to forward a port from the remote instance to your own through SSH tunnel. To create the port forward, use the following command:</p>

```bash
ssh -R <remote_port>:localhost:<local_port> root@127.0.0.1 -p <port>
```

<p>The&nbsp;<em>remote_port</em> is the port on the remote machine which is going to be forwarded to your local machine and&nbsp;<em>local_port</em> is the port which the remote port will be forwarded to on your machine. You should usually set them the same unless the <i>remote_port</i>&nbsp;is blocked or used already on your machine.</p>

<p>Once this has worked successfully, you need to also configure <a href="https://xdebug.org/">Xdebug</a>. In&nbsp;<em>php.ini</em>, make set the following (for full Xdebug configuration, see <a href="https://hajekj.net/2016/09/06/remotely-debugging-php-on-azure-web-apps-with-ngrok/">my previous article</a>):</p>

```ini
xdebug.remote_host = localhost
xdebug.remote_port = <remote_port>
```

<p>And that's it, now you have a secure tunnel set up for PHP debugging.</p>
