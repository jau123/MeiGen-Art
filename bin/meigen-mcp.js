#!/usr/bin/env node

const args = process.argv.slice(2);

if (args[0] === 'init') {
  require('../dist/cli/init.js').init(args.slice(1));
} else {
  require('../dist/index.js');
}
