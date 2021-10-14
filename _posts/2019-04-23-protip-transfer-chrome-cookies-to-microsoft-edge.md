---
title: 'Protip: Transfer Chrome cookies to Microsoft Edge'
date: 2019-04-23T09:00:27+02:00
author: Jan Hajek
permalink: /2019/04/23/protip-transfer-chrome-cookies-to-microsoft-edge/
categories:
  - Microsoft
tags:
  - Google Chrome
  - Microsoft Edge
---
As you might have heard, Microsoft has released a preview version of Microsoft Edge powered by Chromium. If you were using Chrome before and want to make a seamless switch without having to re-log to all your favorite sites, read on!

<!--more-->

<p>First off, you need to locate your Chrome's app data, which are located over here<em>C:\Users\hajek\AppData\Local\Google\Chrome\User Data\Default</em>. You can just use the line below to open the same location in your Explorer:</p>

```
%LOCALAPPDATA%\Google\Chrome\User Data\Default
```

In there, you want to find a file called `Cookies`. Now you need to copy and paste that file to the Edge app data, which are located at `C:\Users\hajek\AppData\Local\Microsoft\Edge SxS\User Data\Default` for me (Edge Canary) or `Dev` or `Beta`, depending which channel you are on:

```
%LOCALAPPDATA%\Microsoft\Edge SxS\User Data\Default
```

Same works for other profiles you may have in the browser - located at `..\Google\Chrome\User Data\Profile X\` where X is the number of the profile.

This should make your switch easier. I strongly suggest however copying only the <em>Cookies</em> file and leaving the rest to the import process of Edge, because some of the data may result in loss of functionality, corruption etc.