# wdio-junit-to-html

This is meant to be used with Webdriverio's JUnit reporter.

A simple CLI tool to convert generated JUnit test results to HTML reports.

### NOTE: Version 3.0.0 is the lowest working version.

---

### Usage
This should be added to your `package.json`, as follows:

#### Please install this globally, or the syntax below will not work.

Note: `-i` and `-o` are required, otherwise default paths will be used.
```
"scripts": {
    ...
    "test": "wdio && wdio-junit-to-html -i <INPUT_DIRECTORY> -o <OUTPUT_DIRECTORY>",
    ...
},
```

## Options
`-i, --input <input>` The input folder path (relative)

`-o, --output <output_directory>` The output folder path (relative)

`-s, --single` Export all reports as one file.

`-l, --log` Log basic information about what is being done.