(function () {
    'use strict';

    var allWindowsTabCount,
        openTabsHistory = {},
        favIconrecords = {};

    // set icon's tooltip
    function updateBadgeTitle(count) {
        var iconTitle = 'You have ' + count + ' open tab(s).';
        chrome.browserAction.setTitle({title: iconTitle});
    }

    // set icon's text
    function updateBadgeText() {
        //var displayOption = localStorage["badgeDisplayOption"];
        //if (typeof displayOption == "undefined" || displayOption == "allWindows") {
        chrome.browserAction.setBadgeText({text: String(allWindowsTabCount)});
        updateBadgeTitle(allWindowsTabCount);
        //} else {
        //Use callback
        //This feature is currently disabled from options.html and options.js
        //count = getCurrentWindowTabs(updateCurrentWindowBadge);
        //}
    }

    //count all tabs in all windows
    function getAllStats(callback) {
        chrome.windows.getAll({populate: true}, function (window_list) {
            callback(window_list);
        });
    }

    function displayResults(window_list) {
        allWindowsTabCount = 0;
        //windowCount = 0;
        for (var i = 0; i < window_list.length; i++) {
            allWindowsTabCount += window_list[i].tabs.length;
        }
        localStorage["windowsCount"] = window_list.length;
        localStorage["allWindowsTabsCount"] = allWindowsTabCount;
        updateBadgeText();
    }

    function registerTabDedupeHandler() {
        chrome.tabs.onUpdated.addListener(
            function (tabId, changeInfo, tab) {
                if (changeInfo.url) {
                    // check if any other tabs with different Ids exist with same URL
                    chrome.tabs.query({'url': changeInfo.url}, function (tabs) {
                        if (tabs.length == 2) {
                            var oldTab = tabs[0].id == tabId ? tabs[1] : tabs[0];
                            // This is a new duplicate
                            var dedupe = confirm(
                                "Duplicate tab detected. Switch to existing open tab?");
                            if (dedupe) {
                                // Switch to existing tab and make it active.
                                chrome.tabs.update(oldTab.id, {'active': true}, function () {
                                    // Make sure the window of that tab is also made active
                                    chrome.windows.update(oldTab.windowId, {'focused': true}, function () {
                                        // And kill the newly opened tab.
                                        chrome.tabs.remove(tabId);
                                    });
                                });
                            }
                        }
                    });
                }
            });
    };

    function registerTabJanitor(days) {
        /** Every X minutes, detect old unused tabs and remove them. */
        setInterval(function () {
            var keys = Object.keys(tab_activation_history);
            var now = Date.now();
            keys.forEach(function (tabId) {
                var ts = tab_activation_history[tabId];
                if (ts - now > (1000 * 60 * 60 * 24 * days)) {
                    // tab was not activated for 5 days
                    chrome.tabs.remove(tabId);
                }
            });
        }, 1000 * 60 * 60);
    };

    function addRecord(tab) {
        console.log(tab);
        //if (tab.status !== "complete" || typeof tab.openerTabId === "undefined") {
        openTabsHistory[tab.id] = {
            title: tab.title,
            url: tab.url,
            openTime: Date.now()
        };
        if (tab.favIconUrl) {
            favIconrecords[tab.url] = tab.favIconUrl;
        } else {
            console.log('fav icon unavailable');
        }
        //}
    }

    function closeRecord(tabId) {
        var closedTab = openTabsHistory[tabId];
        delete openTabsHistory[tabId];

        // flush the tab
        if (closedTab) {
            closedTab.closeTime = Date.now();
            var history = JSON.parse(localStorage['history']);
            history.push(closedTab);
            localStorage['history'] = JSON.stringify(history);
        }
    }

    function recordHistory(tab, action) {
        if (action === 'c') {
            addRecord(tab);
        } else if (action === 'r') {
            closeRecord(tab);
        } else {
            // action = 'u'
            var updatingTab = openTabsHistory[tab.id];
            if (updatingTab) {
                if (updatingTab.url !== tab.url) {
                    closeRecord(tab.id);
                    addRecord(tab);
                } else {
                    // update title if needed
                    updatingTab.title = (updatingTab.title || tab.title);
                }
            } else {
                console.log('never happens happened');
                addRecord(tab);
            }
        }
    }

    /* Keeps track of the last timestamp each tab was activated */
    var tab_activation_history = {};
    chrome.tabs.onActivated.addListener(function (activeInfo) {
        // Store timestamp in ms
        tab_activation_history[activeInfo.tabId] = Date.now();
    });

    function init() {
        // Action taken when a new tab is opened.
        chrome.tabs.onCreated.addListener(function (tab) {
            getAllStats(displayResults);
            recordHistory(tab, 'c');
        });

        // Action taken when a tab is closed.
        chrome.tabs.onRemoved.addListener(function (tab) {
            getAllStats(displayResults);
            recordHistory(tab, 'r');
        });

        // Action taken when a new window is opened
        chrome.windows.onCreated.addListener(function (tab) {
            getAllStats(displayResults);
        });

        // Action taken when a windows is closed.
        chrome.windows.onRemoved.addListener(function (tab) {
            getAllStats(displayResults);
        });

        chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
            if (changeInfo.url) {
                recordHistory(tab, 'u');
            }
        });

        // Initialize the stats to start off with.
        getAllStats(displayResults);

        // Activate tab de-dupe detector if enabled in options.
        if (localStorage["tabDedupe"]) {
            registerTabDedupeHandler();
        }

        // Activate tab janitor if enabled.
        if (localStorage["tabJanitor"]) {
            registerTabJanitor(localStorage["tabJanitorDays"]);
        }

        // initialize history
        if (!localStorage['history']) {
            localStorage['history'] = '[]';
        }
    }

    // Initialize the extension.
    init();
}());
