(function (chrome) {
    'use strict';

    (function () {
        'use strict';
        var aDayInMillis, dayNames, monthNames;
        aDayInMillis = 24 * 60 * 60 * 1000;
        dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        Date.prototype.toFullDateString = function () {
            var today, yesterday,
                fullString = '',
                diff;

            today = new Date(new Date().toDateString());
            yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (this > today) {
                fullString = "Today - ";
            } else if (this > yesterday) {
                fullString = "Yesterday - ";
            }

            fullString = fullString.concat(dayNames[this.getDay()]).concat(', ')
                .concat(monthNames[this.getMonth()]).concat(' ')
                .concat(this.getDate()).concat(', ')
                .concat(this.getFullYear());

            return fullString;
        };

        Date.prototype.toMeridiemTimeString = function () {
            var timeString, meridiem, hr, min;
            if (this.getHours() / 12 < 1) {
                meridiem = ' AM';
            } else {
                meridiem = ' PM';
            }
            hr = this.getHours() % 12;
            hr = hr === 0 ? 12 : hr;
            hr = hr > 9 ? hr : '&nbsp;&nbsp;' + hr;
            min = this.getMinutes() > 9 ? this.getMinutes() : '0' + this.getMinutes();
            timeString =
                ''.concat(hr)
                    .concat(':')
                    .concat(min)
                    .concat(meridiem);

            return timeString;
        };

    }());

    String.prototype.replaceSub = function (sub, newSub) {
        newSub = newSub === null || newSub === undefined ? '' : newSub;
        return this.split(sub).join(newSub);
    }

    function addEntry(ind, entries) {
        var rt, cdr, clone, domainRegEx;
        rt = document.querySelector('#result-entry');
        cdr = document.querySelector('#collapse-result-' + ind + ' ol.day-results');
        clone = rt.innerHTML;
        domainRegEx = /:\/\/([^\/]+)/;

        entries.sort(function (a, b) {
                return b.closeTime - a.closeTime;
            })
            .forEach(function (entry) {
                if (domainRegEx.test(entry.url)) {
                    var cloneEntry
                        = clone.replaceSub('$entryTime$', new Date(entry.closeTime).toMeridiemTimeString())
                        .replaceSub('$tabUrl$', entry.url)
                        .replaceSub('$tabDomain$', domainRegEx.exec(entry.url)[1]);

                    $(cloneEntry).appendTo(cdr);
                }
            });
    }

    function addResultDay(ind, dayString, dayResults) {
        var rt, rc, clone, elm;
        rt = document.querySelector('#result-display-day');
        rc = document.querySelector('.results');
        clone = rt.innerHTML;

        clone = clone.replaceSub('$collapseIndex$', ind)
            .replaceSub('$fullDateString$', dayString);
        elm = $(clone);
        elm.appendTo(rc);

        addEntry(ind, dayResults);
    }

    function getStoredTabs() {
        var historyResults = JSON.parse(localStorage['history']);
        //var len = historyResults.length;
        //var result;
        //while (len--) {
        //    result = historyResults[len]
        //}
        return historyResults;
    }

    function tabsGroupBy(alltabs, by) {
        var groupedData = _.groupBy(alltabs, function (d) {
            if (by === 'closeTime' || by === 'openTime') {
                return new Date(d[by]).toFullDateString();
            }
            return d[by];
        });
        return groupedData;
    }

    function cleanHistory(time) {
        var ddd, tabGroups,
            dir = 'beyond';

        if (time.indexOf('-') === 0) {
            dir = 'past';
            time = time.substr(1);
        }

        tabGroups = tabsGroupBy(getStoredTabs(), 'closeTime');
        if (time.indexOf('day') !== -1) {
            time = parseInt(time.replace('day', ''));
            ddd = new Date(new Date().toDateString());
            ddd.setDate(ddd.getDate() - time);

            Object.getOwnPropertyNames(tabGroups)
                .forEach(function (dateStr, ind) {
                    var histDate = new Date(dateStr);
                    if (histDate >= ddd && dir === 'past') {
                        tabGroups[dateStr] = [];
                    } else if (histDate < ddd && dir === 'beyond') {
                        tabGroups[dateStr] = [];
                    }
                });

        } else if (time.indexOf('hour') !== -1) {
            time = parseInt(time.replace('hour', ''));
            ddd = new Date();
            ddd.setHours(ddd.getHours() - time);

            Object.getOwnPropertyNames(tabGroups)
                .forEach(function (dateStr, ind) {
                    var list, len, dayEntry;
                    if (dateStr === ddd.toFullDateString()) {
                        list = tabGroups[dateStr];
                        len = list.length;
                        while (len--) {
                            dayEntry = list[len];
                            if (dayEntry.closeTime >= ddd && dir === 'past') {
                                list.splice(len, 1);
                            } else if (dayEntry.closeTime < ddd && dir === 'beyond') {
                                list.splice(len, 1);
                            }
                        }
                    } else if (new Date(dateStr) < ddd && dir === 'beyond') {
                        tabGroups[dateStr] = [];
                    }
                });
        }

        // ungroup to array
        var updatedList = [];
        Object.getOwnPropertyNames(tabGroups)
            .forEach(function (dateStr) {
                updatedList = updatedList.concat(tabGroups[dateStr]);
            });

        localStorage['history'] = JSON.stringify(updatedList);
        showHistoryResults(updatedList);
    }

    function initOverlayLayer() {
        document.querySelector('#clearHist').addEventListener('click', function () {
            // show options
            var t, container, clone;
            t = document.querySelector('#overlay-layer');
            container = document.querySelector('.results');
            clone = document.importNode(t.content, true);
            container.appendChild(clone);

            document.querySelector('#submit-clear').addEventListener('click', function () {
                var dd = container.querySelector('.overlay-container select');
                var selectedOption = dd.options[dd.selectedIndex];
                if (selectedOption.value === "empty") {
                    // empty completely
                    localStorage['history'] = '[]';
                } else {
                    cleanHistory(selectedOption.value);
                }
            });

            document.querySelector('.glyphicon.glyphicon-remove').addEventListener('click', function () {
                document.querySelector('.overlay-container').remove();
            });
            document.querySelector('#cancel-clear').addEventListener('click', function () {
                document.querySelector('.overlay-container').remove();
            });

        });
    }

    function showHistoryResults(alltabs) {
        var tabGroups = tabsGroupBy(alltabs, 'closeTime');
        $('.results').empty();
        Object.getOwnPropertyNames(tabGroups)
            .sort(function (a, b) {
                // a<b:-1, a>b:1, a=b:0
                return (new Date(b) - new Date(a));
            })
            .forEach(function (key, ind) {
                addResultDay(ind, key, tabGroups[key]);
            });
    }

    window.addEventListener('load', function () {
        window.setTimeout(function () {
            var alltabs = getStoredTabs();
            showHistoryResults(alltabs);
            initOverlayLayer();
        });
    });

}(chrome));