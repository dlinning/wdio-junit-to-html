#! /usr/bin/env node
var program = require('commander');
const fs = require('fs');
const xml2js = require('xml2js');

var outputDir = 'output';
var inputDir = 'reports';
//How far back the path should go for source files
//3 seems to be the limit
var srcFileDepth = 3;


program
.option('-i, --input <input>', 'The user to authenticate as')
.option('-o, --output <output>', 'The user\'s password')
.option('-l, --log <log>','If used, will let you know when done running.')
.parse(process.argv);

//Actual code that runs
if(program.input)
    inputDir = program.input;
if(program.output)
    outputDir = program.output;
generateFromFolder();
if(program.log)
    console.log('HTML Reports Generated');


function parse(data){
    var output = '<html lang="en"><head><meta charset="UTF-8"><title>JUnit Test Results - junit-to-html</title><script src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js"></script><style>html{font-family:Arial,sans-serif,monospace}.suite,.suite-container{position:relative;display:flex;flex-direction:column;border:1px solid #000;padding:8px;margin:8px 16px}.suite .title{font-size:18px;display:block;padding:4px 2px;background:#4CAF50}.suite>.duration,[class^=count_]{font-size:14px}.has_error,.title.has_error{background:#F44336}.tests{border:1px solid #000;padding:8px;max-height:24px;overflow-y:hidden;transition:.3s ease max-height}.tests .expand_tests{display:block;padding:4px 2px;font-size:16px;font-weight:700;text-decoration:underline}.expand_tests::before{display:block;content:\'Expand Tests ▼\'}.tests.open{max-height:99999999px}.tests.open .expand_tests::before{content:\'Close Tests ▲\'}.tests .expand_tests:hover{background:#7EA6D7;cursor:pointer}.test{display:flex;flex-direction:column;border:1px solid #b6b6b6;margin:8px 0;padding:4px}.test .err_out{background:rgba(0,0,0,.2);padding:8px;margin:0 8px;border-radius:4px}</style></head><body>';

    for(s in data['testsuites']['testsuite']){
        var suite = data['testsuites']['testsuite'][s];
        if(s == 0){
            //First suite, contains information about source file

            var fp = suite['properties'][0]['property'][3]['$']['value'].toString().split('\\');
            var outFp = "";
            for(var n=fp.length-srcFileDepth;n<fp.length;n++){
                outFp += '\\'+fp[n];
            }

            output += `
<div class="suite-container">
    <span class="title"><b>`+JSON.stringify(suite['properties'][0]['property'][1]['$']['value'])+`</b></span>
    <span class="suite-duration"><b>Run Duration: </b>`+suite['$']['time']+`seconds</span>
    <span class="suite-fromfile"><b>Source File: </b>`+outFp+`</span>
    <span class="suite-spec"><b>Spec ID: </b>`+suite['properties'][0]['property'][0]['$']['value']+`</span>
`;
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
<div class="suite">
    <span class="title `+has_error+`"><b>Suite: </b>`+name+`</span>
    <span class="duration"><b>Run Duration: </b>`+op_time+`</span>
    <span class="count_tests"><b>Test Count: </b>`+count_tests+`</span>
    <span class="count_fails"><b>Failed Test Count: </b>`+count_fails+`</span>
    <span class="count_errors"><b>Error Count: </b>`+count_errors+`</span>
    <span class="count_skips"><b>Skipped Test Count: </b>`+count_skips+`</span>
    <div class="tests">
        <span class="expand_tests"></span>`;
            //Output the individual tests
            for(var t in suite['testcase']){
                var test = suite['testcase'][t];
                var error = '';
                var err_out = '';

                if(test['error'] != null){
                    error = '<i style=\"color:red;\">'+test['error'][0]['$']['message']+'</i>';
                    err_out = '<pre class="err_out">'+test['system-err']+'</pre>';
                } else {
                    error = "<i style=\"color:green;\">PASS</i>";
                }

                output += `
<div class="test">
    <span class="name"><b>Name: </b>`+test['$']['name']+`</span>
    <span class="duration"><b>Run Time: </b>`+test['$']['time']+`seconds</span>
    <span class="result"><b>Result: </b>`+error+`</span>
    <span>`+err_out+`</span>
</div>`;
            }

            output += '</div></div>';
        }

    }
    output += '</div><!--Closes `.suite-container`-->';

    output += "</body><script>$(function(){$('.expand_tests').on('click',function(){$(this).parent().toggleClass('open');});});</script></html>";

    return output;
}

function convertToHTML(filePath){
    var output = filePath;
    var pathSplit = filePath.split('\\');
    fs.readFile(inputDir+'/'+filePath, 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
        }
        xml2js.parseString(data,function(err,result){
            fs.writeFile(
                outputDir+'/'+pathSplit[pathSplit.length-1].substr(0,pathSplit[pathSplit.length-1].length-4)+'.html',
                parse(result),
                function(err){
                    if(err){
                        return console.log(err);
                    }
                }
            );
        });
    });

}

function generateFromFolder(){
    if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir);
    }

    fs.readdir(inputDir, (err, files) => {
        files.forEach(file => {
            if(file.substr(-4) == '.xml'){
                convertToHTML(file);
            }
        });
    })
}
