---
title: Working on Surface Pro X
date: 2020-10-07T21:30:00+02:00
author: Jan Hajek
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - Surface
  - Codespaces
  - Remove Development
---

About a month ago, I refreshed my device - Dell XPS13 with Surface Pro X. The major difference between these two for me was ARM64 processor architecture, which I was initially quite skeptical about.

I first got my hands-on with Surface Pro X in February during Microsoft Ignite Tour in Prague, one of the last events I attended in person before COVID-19 lockdowns started. Just for fun, we installed bunch of apps like Visual Studio Code, Git, .NET Core on the device and it all worked! Obviously the Win32 emulation did its job. I also really liked the fan-less experience of the device, since the device is pretty silent thanks to it (no more "flying to the Moon" situations).

> ...couple months later, a present arrived - Surface Pro X!

After initial Windows setup, upgrading to Pro edition (to have full BitLocker controls and MDM support), I installed bunch of essential apps which I use on daily basis:

- Visual Studio Code (has full ARM64 support)
- Windows Terminal
- Bitwarden
- Microsoft Office
- Microsoft Teams (more on that later)
- WinSCP (via Microsoft Store)
- OpenSSH (native Windows feature)
- .NET Core SDK (Win32 emulation)
- Node.js (Win32)
- Git (Win32 emulation)
- and bunch of other apps

I haven't hit any issues except for the OpenSSH feature, which didn't seem to execute, but luckily, it was as simple as adding `C:\Windows\SysNative\OpenSSH` to my PATH (thanks [Reddit](https://www.reddit.com/r/PowerShell/comments/ic83k8/installing_openssh_on_arm_64_surface_pro_x/g22k08l/)).

Since installing wasn't any issue, I started using the apps the way I use them. In few Twitter threads I saw that people use the PWA version of Outlook on the web, so instead of installing full Outlook, I ended up with trying the PWA version - works pretty nice and no OST file is present on the disk to consume storage. The PWA suports notifications, which are pretty nice as well, and if I need to compose something while offline (yeah, the Outlook PWA doesn't really work offline at the time of writing), I can just use Mail app present in Windows 10.

I actually switched to bunch of PWAs since then, Spotify for example. Still thinking about switching to Office on the web, however since it is quite complex to open local files (even with OneDrive enabled), I am probably not going to do that anytime soon.

# Development
Probably the most important part of this topic - how the heck do you develop on ARM64? Simple - you don't. There's bunch of featur requests and ongoing issues (with [OmniSharp](https://github.com/OmniSharp/omnisharp-vscode/issues/3006), [Azure Functions](https://github.com/Azure/azure-functions-core-tools/issues/2180), ...), however it is just SDK related stuff, you can nicely run the apps (but just don't have the development comfort). What works very nicely is TypeScript / Node.js development.

Saying I don't develop on ARM64 is true, I develop on regular machine to which I remotely connect. At work, I have a desktop workstation (from my gaming years) which runs smoothly. I then use the [Remote Development tools](https://code.visualstudio.com/docs/remote/remote-overview) in VS Code to connect to my PC remotely via SSH and done.

> Enabling SSH host on Windows is simple - check the [docs](https://docs.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse), if you are using admin-enabled account, you need to take an [extra step](https://superuser.com/questions/1342411/setting-ssh-keys-on-windows-10-openssh-server).

At work I have Wake on LAN setup (or wake on phone if it fails). However trying to use cloud-first environments, I also setup two machines in Azure - one on Windows and one on Linux. Both have most of my most common tools and SDKs installed, so I can just connect to those via SSH from anywhere.

But Microsoft also has [GitHub Codespaces](https://github.com/features/codespaces) (formerly Visual Studio Online / Codespaces). I have been one of the lucky people who have access to the preview version. Using Codespaces from VS Code is as simple as connecting to my own machine - I suggest you give it a try.Pretty powerful.

Speaking of PWAs, you can also use GitHub Codespaces as a PWA (app per project though).

# Gaming
I can't skip this part - using a device, which isn't really meant for gaming but still gaming on it? Hell, yea! There are few ways to achieve this right now - selfhosted version, which I use as well is [Parsec](https://parsecgaming.com/). Simply setup an [NV-series VM in Azure](https://docs.microsoft.com/en-us/azure/virtual-machines/sizes-gpu) and you're good to go to play literally anything. There are really good [articles](https://medium.com/azure-cloud/a-killer-guide-for-cloud-gaming-on-azure-march-2020-1aa56d13fba3) on the internet how-to set it up, so not going to go into this (there is also an official [VM prep tool available](https://github.com/parsec-cloud/Parsec-Cloud-Preparation-Tool)). But if you don't want to bother with setting up your VM, you can go with [NVIDIA GeForce NOW](https://www.nvidia.com/en-us/geforce-now/) (which I had the luck to testsince early preview as well). Another alternative in future may be [xCloud](https://www.xbox.com/en-US/xbox-game-pass/cloud-gaming) on PC, which is unfortunately only available on Android at the time of writing.

So as you can see gaming on Surface Pro X isn't an issue either.

# Other experiences
I also wanted to write a little bit about Microsoft Teams... It took Microsoft literally months to bring Teams to ARM64 which is really a shame. I love Teams, use it on daily basis, but not having a native support on the release day of such a device like Surface Pro X isn't really a good marketing. The good thing is, that even though the official installer for ARM64 [isn't available yet](https://microsoftteams.uservoice.com/forums/555103-public/suggestions/39333265-offer-a-native-windows-on-arm-arm64-version), there already have been [leaks](https://www.onmsft.com/news/microsoft-teams-is-getting-a-native-arm64-version-this-month) containing the installer, which greatly improves Teams performance on ARM64.

Another great benefit is built-in LTE module, which already came handy few times for me (it also supports eSIM).

Battery life is also very nice, I can use the device for about 8 hours without the need of charging.

Connectivity in general is good. You get one Surface adapter, which is also a charger, with the awesome feature of a built-in USB charger for your phone or another device and two USB-C ports. Getting a USB-C adapter is a must, I carry a [Microsoft USB-C Travel Hub](https://www.microsoft.com/en-us/p/microsoft-usb-c-travel-hub/8nlwz0mqk26d), so I can pretty much connect to anything, except for my Audio Jack headphones from Apple.

I use AirPods with my iPhone, however the AirPods experience on Windows isn't really so great. You can use AirPods as sound output, but not as input at the same time - but it looks like a Teams-related issue rather than general system issue ([1](https://answers.microsoft.com/en-us/msoffice/forum/msoffice_o365admin-mso_teams-mso_o365b/microsoft-teams-and-apple-airpod-compatability/8e37c3c2-f8e2-4f51-9888-1a6ea65de713?auth=1), [2](https://microsoftteams.uservoice.com/forums/555103-public/suggestions/33069673-support-for-airpods)).

One more thing which I am really looking forward to is the [x64 emulation which should be coming soon](https://blogs.windows.com/windowsexperience/2020/09/30/now-more-essential-than-ever-the-role-of-the-windows-pc-has-changed/) to all ARM64 based devices with Windows 10!

All in all, this is a great experience and I am really in love with my Surface Pro X!