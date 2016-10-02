(function (chrome) {
    'use strict';

    //get count of all tabs. Required for the popoup display box.
    function getAllTabsCount() {
        function updateLength(varName, value) {
            var allTabsCountElm, modifiedHtml;
            allTabsCountElm = document.getElementById('allTabsCount');
            modifiedHtml = allTabsCountElm.innerHTML.replace(varName, value);
            allTabsCountElm.innerHTML = modifiedHtml;
        }

        chrome.tabs.query({}, function (tabs) {
            updateLength("$tabsLength$", tabs.length);
        });
        chrome.windows.getAll({windowTypes: ['normal']}, function (windows) {
            updateLength("$windowsLength$", windows.length);
        });
    }

    //get tabs in current window
    function getCurrentWindowTabs(callback) {
        chrome.windows.getCurrent({populate: true}, function (window) {
            callback([window]);
        });
    }

    // all tabs by window - shift focused window to first
    function getAllTabsByWindow(callback) {
        chrome.windows.getAll({populate: true, windowTypes: ['normal']}, function (windows) {
            var windowTabs = [];
            windows.forEach(function (window) {
                if (window.focused) {
                    windowTabs.unshift(window);
                } else {
                    windowTabs.push(window);
                }
            });
            callback(windowTabs);
        });
    }

    function displayResults(windows) {
        getAllTabsCount();
        var windowListElm = document.getElementById('windowList');
        windows.forEach(function (window, ind) {
            // add a window fieldset
            var fieldsetElm, tableElm,
                tabs, numTabs, row, cell1, cell2, cell3, i;
            tabs = window.tabs;
            numTabs = tabs.length;

            fieldsetElm = document.createElement('fieldset');
            windowListElm.appendChild(fieldsetElm);

            fieldsetElm.id = window.id;
            fieldsetElm.innerHTML = '<legend><p class="box">  ' + numTabs + ' tabs on this window #' + (ind + 1) + ' </p></legend>';
            tableElm = document.createElement('table');
            fieldsetElm.appendChild(tableElm);

            for (i = 0; i < numTabs; i++) {
                row = tableElm.insertRow(i);
                cell1 = row.insertCell(0);
                cell2 = row.insertCell(1);
                cell3 = row.insertCell(2);

                cell1.innerHTML = '<a class="redlink" href="">X</span>';
                cell2.innerHTML = '<div class="favicon" style=\'background-image: -webkit-image-set(url("chrome://favicon/size/16@1x/' + tabs[i].url + '") 1x);\'>';
                cell3.innerHTML = '<a href="" title="' + tabs[i].url + '">' + tabs[i].title + '</a>';

                cell1.addEventListener("click", (function (tabID) {
                    return function () {
                        closeTab(tabID);
                    }
                })(tabs[i].id));

                cell3.addEventListener("click", (function (tabID, windowID) {
                    return function () {
                        openTab(tabID, windowID);
                    }
                })(tabs[i].id, tabs[i].windowId));
            }
        });
        // end of displayResults method
    }

    // function to display the selected tab
    function openTab(tabID, windowID) {
        chrome.windows.update(windowID, {focused: true});
        chrome.tabs.update(tabID, {active: true});
    }

    // function to close the selected tab
    function closeTab(tabID) {
        chrome.tabs.remove(tabID);
        // reload popup to refresh the count and links
        window.location.reload();
    }

    function initPage() {
        var tabsDisplayOption = localStorage["popupDisplayOption"];
        // if extension is just installed or reloaded, tabsDisplayOption will not be set
        if (typeof tabsDisplayOption === "undefined" || tabsDisplayOption === "currentWindow") {
            getCurrentWindowTabs(displayResults);
        } else {
            getAllTabsByWindow(displayResults);
        }

        window.setTimeout(function () {
            var historyLink = chrome.extension.getURL('open-tabs-history.html');
            var elm = document.querySelector('.history-link a');
            elm.href = historyLink;
        }, 100);
    }

    initPage();

}(chrome));