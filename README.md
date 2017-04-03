#wdio-junit-to-html

This is meant to be used with Webdriverio's JUnit reporter.

##NOTE: Version 3.0.0 is the lowest working version.

###Usage
This should be added to your `package.json`, as follows:

####Please install this globally, or the syntax below will not work.

```
"scripts": {
    ...
    "test": "wdio && wdio-junit-to-html -i <INPUT_DIRECTORY> -o <OUTPUT_DIRECTORY> [-l <ENABLE_LOGGING>]",
    ...
},
```