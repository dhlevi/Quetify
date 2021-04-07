#!/usr/bin/env node

/**
 * This is a basic nodejs CLI for managing Quetify queues. This tool allows you to
 * create a Quetify Database and config collection, and queue collections, delete them,
 * monitor them, and manage data. For more information on Quetify or how it works, check
 * the main readme in the repo
 */

const yargs       = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const chalk       = require('chalk');
const log         = console.log;
// the command modules (might replace with client lib in the future)
const createQ     = require('./lib/createQueue');
const deleteQ     = require('./lib/deleteQueue');
const emptyQ      = require('./lib/emptyQueue');
const monitorQ    = require('./lib/monitorQueue');
const listQ       = require('./lib/listQueue');

// parse the command line (thanks yargs, you rock!)
const args = yargs(hideBin(process.argv))
              .command('create', 'Create a queue database')
              .command('delete', 'Delete a queue database')
              .command('monitor', 'Monitor a queue database')
              .command('clear', 'Clear a queue database of completed messages')
              .command('flush', 'Clear a queue of all messages')
              .option('server', {
                alias: 's',
                type: 'string',
                demandOption: '',
                description: 'The connection string for a mongodb server. Do not include a database name, as the queue services will connect/create a database and collections as needed. Do supply required user/password authentication.'
              }).option('queuename', {
                alias: 'q',
                type: 'string',
                description: 'The name of the queue to create/delete/clear'
              }).option('type', {
                alias: 't',
                type: 'string',
                description: 'The type of the queue to create. Can be FIFI or Stack'
              }).option('priority', {
                alias: 'p',
                type: 'boolean',
                description: 'Allow a queue to use priority'
              }).option('retrylimit', {
                alias: 'r',
                type: 'number',
                description: 'The max number of retries a queue will allow'
              })
              .demandCommand(1, 1, 'You need to enter a command to use this tool', 'Only supply one command to use this tool')
              .demandOption('server', 'A MongoDB server connection string must be supplied')
              .argv

// Make sure the command exists, and there's only oe. Should be handled by yargs
const validCommands = ['create', 'delete', 'monitor', 'flush', 'clear', 'list'];
if (args._.length !== 1 || (args._.length === 1 && !validCommands.includes(args._[0]))) {
  log(chalk.red(`Command '${args._}' is invalid. Please run '--help' for more information on how to use this tool.`));
}

// handle the command
switch (args._[0]) {
  case 'create':
    createQ(args);
    break;
  case 'delete':
    deleteQ(args);
    break;
  case 'monitor':
    monitorQ(args);
    break;
  case 'flush':
    emptyQ.flush(args);
    break;
  case 'clear':
    emptyQ.clear(args);
    break;
  case 'list':
    listQ(args);
    break;
  default:
    log(chald.red('Uh-oh, something unexpected went wrong!'));
    break;
}
