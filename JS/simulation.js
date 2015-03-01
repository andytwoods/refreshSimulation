//numbers
var simulations = 10000;
var refresh = 16.6666;//http://en.wikipedia.org/wiki/Refresh_rate. typically 60 on LCDs
var maxStimDuration = 32;
var minStimDuration = 1;
var dp = 4;
var stimDurations = [] ///[1,2,3,16]; //if not blank, used instead of above.


//Some simple statistics
var Stats = (function(){
    var stats = {};
    stats.median = function (plug)
    {
        // Even length.
        if(plug.length % 2 == 0)
        {
            var a = plug[parseInt(plug.length / 2) - 1];
            var b = plug[parseInt(plug.length / 2)];

            return (a + b) / 2;
        }
        // Odd length.
        return plug[parseInt(plug.length / 2)];
    }

    stats.average = function(aArray) {
        return stats.sum(aArray) / aArray.length;
    }

    stats.sum = function(aArray) {
        var nSum = 0;
        for(var i = 0; i < aArray.length; i++) {
            if(typeof aArray[i] == "number") {
                nSum += aArray[i];
            }
        }
        return nSum;
    }
    stats.round = function(numberVal, precision){
        var decimalPlaces = Math.pow(10, precision);
        return Math.round(decimalPlaces * numberVal) / decimalPlaces;
    }

    return stats
})();



//Simulating a single trial
var Trial = (function(){
    var trial = {};
    trial.refresh;
    trial.stimulusDuration=15;

    var dif;

    trial.setRefresh = function(_refresh){
        trial.refresh = _refresh;
    }

    trial.result = function()
    {
        //test();
        var randomTimeDuringRefresh = Math.random()*refresh;
        return calc(trial.refresh, randomTimeDuringRefresh, trial.stimulusDuration);
    }



    function test()
    {
        console.log(10 == calc(10, 0, 10).actualDuration);
        console.log(18 == calc(9, 0, 10).actualDuration);
        console.log(11 == calc(11, 0, 10).actualDuration);
        console.log(10 == calc(10, 1, 10).actualDuration);
        console.log(100 == calc(10, 1, 100).actualDuration);
        console.log(108 == calc(9, 0, 100).actualDuration);
        console.log(100 == calc(100, 0, 90).actualDuration);
        console.log(100 == calc(100, 50, 90).actualDuration);
        console.log(16 == calc(16, 0, 16).actualDuration);
    }



    function calc(_refresh, _start, _duration)
    {
        var _result ={};

        _result.start = _start;
        _result.finish= _duration + _start;
        _result.duration= _duration;
        _result.refresh= _refresh;
        _result.actualStart = calcDifference(_start,_refresh);
        _result.actualFinish = calcDifference(_duration + _start, _refresh);
        _result.actualDuration = _result.actualFinish - _result.actualStart;

        return _result;
    }

    function calcDifference(time, refresh){

        dif = time % refresh;
        if(dif>0){
            return  time - dif + refresh;
        }
        return	time ;
    }
    return trial;
    }
)();




//arrays
var results = [];
var result;
var rows = [];

runSimulations();

function runSimulations() {
    Trial.setRefresh(refresh)

    function chunk(arr) {
        var chunks = {};
        var len = arr.length;

        for (var i = 0; i < len; i++) {
            calc(chunks, arr[i]);
        }

        for (var key in chunks) {
            chunks[key] = Stats.round(chunks[key] / len * 100, 2);
        }
        chunks.duration = arr[0].duration;
        return simplify(chunks);
    }

    function calc(chunks, info) {
        var id = info.actualStart + "_" + info.actualDuration;
        if (chunks.hasOwnProperty(id) == false) chunks[id] = 1;
        else chunks[id]++;
    }

    var headers = [];

    function simplify(obj) {

        var info = {};
        var dur = getProp('duration');

        for (var key in obj) {
            var label = createColumnHeader(key);
            if (headers.indexOf(label) == -1)headers.push(label);
            info[label] = parseFloat(obj[key]); //RHS is %
        }

        function getProp(prop) {
            var val = obj[prop];
            delete obj[prop];
            return val;
        }

        function createColumnHeader(str) {
            var arr = str.split("_");
            return 'start=' + arr[0] + "ms, duration=" + Stats.round(arr[1],dp) + 'ms';
        }


        info.dur = dur;
        return info;
    }


    if (stimDurations && stimDurations.length > 0) {
        for (var i = 0; i < stimDurations.length; i++) {
            var stimDuration = stimDurations[i];
            result = simulateOnce(stimDuration, '');
            results.push(  chunk(result)  );
        }
    }
    else {
        for (var i = minStimDuration; i <= maxStimDuration; i++) {
            result = simulateOnce(i, '');
            results.push(chunk(result));
        }
    }


    //sortOn from https://stackoverflow.com/questions/979256/sorting-an-array-of-javascript-objects
    results.sort(function(a,b) { return parseFloat(a.dur) - parseFloat(b.dur) } );
    //addMissingHeaders
    headers.sort();
    var header;
    var row;



    for(var i=0;i<results.length;i++){
       result = results[i];
       row = [result.dur];
       for(var i_header=0;i_header<headers.length;i_header++){
           header = headers[i_header];
           if(result.hasOwnProperty(header))    row.push(result[header])
           else                                 row.push(0);
       }

        rows.push(row);
    }

    headers.unshift("duration")
    rows.unshift(headers);


}

function simulateOnce(stimDuration, dv)
{
    var info = [];
    var result;

    for(var i=0;i<simulations;i++){
        //console.log(Trial)
        Trial.stimulusDuration = stimDuration;
        result = Trial.result();
        if(dv!='')		info[info.length]  = result[dv];
        else 			info[info.length]  = result;
    }
    return info;
}




google.load("visualization", "1.1", {packages:["corechart"]});
google.setOnLoadCallback(drawChart);
function drawChart() {
    var data = google.visualization.arrayToDataTable(rows);

    var view = new google.visualization.DataView(data);


    var options = {
        width: 1024,
        height: 768,
        legend: { position: 'top', maxLines: 5 },
        bar: { groupWidth: '75%' },
        isStacked: true,
        vAxis: {title: "percentage likelihood of different timing scenarios"},
        hAxis: {title: "duration of stimulus (ms)"}
    };
    var chart = new google.visualization.ColumnChart(document.getElementById("barchart_values"));
    chart.draw(view, options);
}