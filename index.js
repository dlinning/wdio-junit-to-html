#! /usr/bin/env node
var program = require('commander');
const fs = require('fs');
const xml2js = require('xml2js');
const dateFormat = require('dateformat');

const HTMLVars = require('./vars.js');

var d = new Date();
const generationDate = dateFormat(d,'isoDate');

var outputDir = 'reports/output';
var inputDir = 'reports';
//How far back the path should go for source files
var srcFileDepth = 3;

var menu = [];menu.push('TEMP');
var menuID = 0;
var failed = 0;
var passed = 0;

program
.usage('[options]')
.option('-i, --input <input>', 'The input folder path (relative)')
.option('-o, --output <output>', 'The output folder path (relative)')
.option('-s, --single','Export all reports in one file')
.option('-l, --log','Log basic information about what is being done.')
.parse(process.argv);

//Actual code that runs when module called
if(program.input)
    inputDir = program.input;
if(program.output)
    outputDir = program.output;

generateFromFolder(); //Handles `program.single` within

//Functions Below
function parse(data){
    var output = '';

    for(s in data['testsuites']['testsuite']){
        var suite = data['testsuites']['testsuite'][s];
        if(s == 0){
            //First suite, contains information about source file

            var fp = suite['properties'][0]['property'][2]['$']['value'].toString().split('\\');
            var outFp = "";
            for(var n=fp.length-srcFileDepth;n<fp.length;n++){
                outFp += '\\'+fp[n];
            }

            output += `
<div class="suite-container" id="suite_`+menuID+`">
    <span class="title"><b>`+suite['properties'][0]['property'][1]['$']['value']+`</b></span>
    <span class="suite-duration"><b>Run Duration: </b>`+suite['$']['time']+`seconds</span>
    <span class="suite-fromfile"><b>Source File: </b>`+outFp+`</span>
    <span class="suite-spec"><b>Spec ID: </b>`+suite['properties'][0]['property'][0]['$']['value']+`</span>
`;
            menu.push('<li class="head"><a href="#suite_'+menuID+'">'+suite['properties'][0]['property'][1]['$']['value']+'</a></li>');
            menuID++;
        } else {
            // All "sub-suites"

            var name = suite['properties'][0]['property'][1]['$']['value'];
            var op_time = suite['$']['time']+'seconds';
            var count_tests = suite['$']['tests'];
            var count_fails = suite['$']['failures'];
            var count_errors = suite['$']['errors'];
            var has_error = "";
            if(parseInt(count_errors) > 0){
                has_error = "has_error"
            }
            var count_skips = suite['$']['skipped'];

            //Begin outputting test suite to html
            output += `
    <div class="suite" id="sub_`+menuID+`">
        <span class="title `+has_error+`"><b>Suite: </b>`+name+`</span>
        <span class="duration"><b>Run Duration: </b>`+op_time+`</span>
        <span class="count_tests"><b>Test Count: </b>`+count_tests+`</span>
        <span class="count_fails"><b>Failed Test Count: </b>`+count_fails+`</span>
        <span class="count_errors"><b>Error Count: </b>`+count_errors+`</span>
        <span class="count_skips"><b>Skipped Test Count: </b>`+count_skips+`</span>
        <div class="tests">
            <span class="expand_tests"></span>`;
            menu.push('<li class="sub"><a href="#sub_'+menuID+'">'+suite['properties'][0]['property'][1]['$']['value']+'</a></li>');
            menuID++;
            //Output the individual tests
            for(var t in suite['testcase']){
                var test = suite['testcase'][t];
                var error = '';
                var err_out = '';

                if(test['error'] != null){
                    error = '<i style=\"color:red;\">'+test['error'][0]['$']['message']+'</i>';
                    err_out = '<pre class="err_out">'+test['system-err']+'</pre>';
                    failed++;
                } else {
                    error = "<i style=\"color:green;\">PASS</i>";
                    passed++;
                }

                output += `
    <div class="test" id="test_`+menuID+`">
        <span class="name"><b>Name: </b>`+test['$']['name']+`</span>
        <span class="duration"><b>Run Time: </b>`+test['$']['time']+`seconds</span>
        <span class="result"><b>Result: </b>`+error+`</span>
        <span>`+err_out+`</span>
    </div>`;
                var menuErr = (test['error'] != null) ? ' error' : '';
                menu.push('<li class="test'+menuErr+'"><a href="#test_'+menuID+'">'+test['$']['name']+'</a></li>');
                menuID++;
            }

            output += '</div></div>';
        }

    }
    output += '</div>\n<!--Closes `.suite-container`-->';

    return output;
}

function cleanMenu(){
    //"Finishes" the report, adds `#content`
    //MUST SET `menu = [];` AFTER CALLING THIS AND USING `menu` SOMEWHERE.
    menu[0] = '<li id="nav_counts">Report: '+generationDate+'<br><span class="has_error">FAILED: '+failed+'</span><br><br><span>PASSED: '+passed+'</span><br></li>';
    menu.push('<li style="padding:8px 16px;"><button onclick="openall()">Open/Close all Tests</button></li></ul></nav>\n<div id="content">');
    failed = 0;
    passed = 0;
}

function convertSingleFileToHTML(filePath){
    var output = filePath;
    var pathSplit = filePath.split('\\');
    fs.readFile(inputDir+'/'+filePath, 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
        }
        xml2js.parseString(data,function(err,result){
            var res = parse(result);

            //Finish up the menu
            cleanMenu();

            fs.writeFile(
                outputDir+'/'+pathSplit[pathSplit.length-1].substr(0,pathSplit[pathSplit.length-1].length-4)+'.html',
                HTMLVars.HTMLHeader+menu.join('')+res+HTMLVars.HTMLFooter, //Actually parse the input here
                function(err){
                    if(err){
                        return console.log(err);
                    }
                }
            );
        });
        menu = []; //Reset menu
    });
}

function exportAsOneFile(){
    var allFiles = []; //Array to hold all tests as HTML

    var files = fs.readdirSync(inputDir);
    //Go through all .xml files and add HTML to the `allFiles` array
    files.forEach(file => {
        if(file.substr(-4) == '.xml'){
            var data = fs.readFileSync(inputDir+'/'+file);//, 'utf8', function (err,data) {
            xml2js.parseString(data,function(err,result){
                //Add parsed XML -> HTML to `allFiles`
                allFiles.push( parse(result) );
            });
        }
    });

    //Finish up the menu
    cleanMenu();

    fs.writeFile(
        outputDir+'/alltests-'+generationDate+'.html',
        HTMLVars.HTMLHeader+menu.join('')+allFiles.join("\n\n<!--New Result File-->\n")+HTMLVars.HTMLFooter, //Actually parse the input here
        function(err){
            if(err){
                return console.log(err);
            }
        }
    );
    menu = []; //Reset menu

}

function generateFromFolder(){
    //Check if `outputDir` exists
    //if not, create it
    var startTime = new Date().getUTCMilliseconds();
    if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir);
    }

    fs.readdir(inputDir, (err, files) => {
        if(program.single){
            //Will output all files as one
            if(program.log)
                console.log('Exporting files into one output.html');
            exportAsOneFile();
        } else {
            //Will output all files individually
            if(program.log)
                console.log('Exporting files individually');
            files.forEach(file => {
                if(file.substr(-4) == '.xml'){
                    convertSingleFileToHTML(file);
                }
            });
        }
        var endTime = new Date().getUTCMilliseconds();
        var runTime = (endTime-startTime)/1000;
        if(program.log){
            console.log('HTML Report(s) Generated in `%s`\n\tDone in %sseconds',outputDir,runTime);
        }
    });
}
