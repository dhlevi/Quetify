const MongoClient = require('mongodb').MongoClient;
const chalk       = require('chalk');
const log         = console.log;

/**
 * These utilty functions will flush data from your queues.
 * By defualt, Quetify doesn't delete documents, it just
 * sets the status. If you want to clear out old messages
 * you can use this to totally empty the queue, or just
 * removed acknowledged messages.
 * @param {*} args 
 */
module.exports.flush = async function flush (args) {
  log(chalk.green('Flushing Queue'));
  if (!args.q) {
    log(chalk.red('A queue name was not provided. You must supply a parameter for a queue name. See the --q parameter for details.'));
    return;
  }

  // connect to server, create queue db if needed
  const client = await MongoClient.connect(args.server, { useUnifiedTopology: true });
  try {
    const db = client.db('quetify-db');
    log(chalk.green(`Quetify Queue DB connected: ${args.server + '/quetify-db'}`));
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    // check if queue/collection names exists, create queue config collection if needed

    if (!collectionNames.includes(args.q)) {
      log(chalk.red(`Queue ${args.q} does not exist. Ignoring command.`));
    } else {
      // flush queue collection
      const collection = db.collection(args.q);
      await collection.deleteMany({});
      log(chalk.green(`Flushed queue ${args.q}...`));
      // We're all done. close the connection
    }
  } catch (err) {
    log(chalk.red(`An error occured while flushing your Queue ${err}`));
  }

  client.close();
}

module.exports.clear = async function clear (args) {
  log(chalk.green('Clearing Queue'));
  if (!args.q) {
    log(chalk.red('A queue name was not provided. You must supply a parameter for a queue name. See the --q parameter for details.'));
    return;
  }

  // connect to server, create queue db if needed
  const client = await MongoClient.connect(args.server, { useUnifiedTopology: true });
  try {
    const db = client.db('quetify-db');
    log(chalk.green(`Quetify Queue DB connected: ${args.server + '/quetify-db'}`));
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    // check if queue/collection names exists, create queue config collection if needed

    if (!collectionNames.includes(args.q)) {
      log(chalk.red(`Queue ${args.q} does not exist. Ignoring command.`));
    } else {
      // clearing queue collection
      const collection = await db.collection(args.q);
      await collection.deleteMany({ status: 'acknowledged'});
      log(chalk.green(`Clearing queue ${args.q}...`));
      // We're all done. close the connection
    }
  } catch (err) {
    log(chalk.red(`An error occured while clearing your Queue ${err}`));
  }

  client.close();
}