---
title: Fixing WinSCP editor error
date: 2019-06-10T09:00:56+02:00
author: Jan Hajek
permalink: /2019/06/10/fixing-winscp-editor-error/
categories:
  - Open Source
  - Visual Studio Code
tags:
  - Visual Studio Code
  - WinSCP
---

<p>I have been a heavy user of <a href="https://winscp.net">WinSCP</a> for quite a few years. It is a great tool whether you need to connect to FTP, SFTP or even WebDAV servers. WinSCP offers an integration with code editors so that you can open the remote file and edit it with your local editor. Since April, I started hitting a <a href="https://winscp.net/forum/viewtopic.php?t=27695">weird issue</a> which prevented me from using this feature correctly.</p>

<!--more-->

<p>For a while WinSCP has been offering an option to be installed via <a href="https://www.microsoft.com/store/apps/9p0pq8b65n8x?cid=downloads">Microsoft Store</a> which is really awesome - automated background updates!</p>

<p>Basically the application has been converted into MSIX package and distributed through Microsoft Store. I have been using the editor feature for few months successfuly but suddenly, I started seeing following errors:</p>
<pre class="wp-block-preformatted"><em>System Error. Code: 1392. 
The file or directory is corrupted and unreadable</em>  </pre>
<p>During that, the only workaround was to launch it via shortcut ( <em>C:\Users\hajek\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd</em>) through command-line which worked, but I sometimes ended up with multiple command-line windows open.</p>

<p>Since I don't really edit code this way anymore, rather server configuration from time to time or use it for file transfer only, I didn't pay much attention.</p>

<p>Today, I decided to figure out what was going on. After reading some stuff about how <a href="https://docs.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-behind-the-scenes#file-system">File System operations</a> work in packaged apps,  I reallized that the issue must there.</p>

<p>So I browsed through the app's filesystem which is located at:  <em>C:\Users\%USERNAME%\AppData\Local\Packages\MartinPikryl.WinSCP_tvv458r3h9r5m\</em> and found what I was looking for!</p>

<p>The <em>Code.exe</em> file was present there (in <em>LocalCache\Local\Programs\Microsoft VS Code</em>) in some weird corrupt state. I simply went and deleted the VS Code folder and everything started to work like before!</p>
