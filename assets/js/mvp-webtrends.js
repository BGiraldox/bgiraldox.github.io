(function () {
    window.addEventListener('load', function () {
        var webtrendsList = [
            "docs.microsoft.com",
            "social.technet.microsoft.com",
            "azure.microsoft.com",
            "techcommunity.microsoft.com",
            "social.msdn.microsoft.com",
            "devblogs.microsoft.com",
            "developer.microsoft.com",
            "channel9.msdn.com",
            "gallery.technet.microsoft.com",
            "cloudblogs.microsoft.com",
            "technet.microsoft.com",
            "msdn.microsoft.com",
            "blogs.msdn.microsoft.com",
            "blogs.technet.microsoft.com",
            "microsoft.com/handsonlabs"
        ];
        for (var c = document.getElementsByTagName("a"), a = 0; a < c.length; a++) {
            var b = c[a];
            if (b.getAttribute("href") && b.hostname !== location.hostname) {
                var url = new URL(b.getAttribute("href"));
                if (webtrendsList.indexOf(url.hostname) !== -1 && url.searchParams.get("WT.mc_id") == null) {
                    url.searchParams.set("WT.mc_id", "AZ-MVP-5003178");
                    b.href = url.toString();
                }
            }
        }
    });
})();