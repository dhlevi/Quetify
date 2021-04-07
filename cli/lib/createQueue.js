const MongoClient = require('mongodb').MongoClient;
const chalk       = require('chalk');
const log         = console.log;

/**
 * Handle creation of the Quetify DB and a quetify queue.
 * When this command is run, it will create a Quetify database and config collection
 * if one doesn't exist, so ensure your connection string contains valid authentication
 * for that task. The Queue collection will use default settings when no settings are
 * provided in the args.
 * @param {*} args 
 */
module.exports = async function create (args) {
  log(chalk.green('Creating new Queue'));
  if (!args.q) {
    log(chalk.red('A queue name was not provided. You must supply a parameter for a queue name. See the --q parameter for details.'));
    return;
  }

  // validate queue name
  if (args.q.includes('$') || args.q === '' || args.q.startsWith('system.')) {
    log(chalk.red(`Your provided queue name '${args.q}' is invalid. Please try again with a valid name`));
  }

  // connect to server, create queue db if needed
  const client = await MongoClient.connect(args.server, { useUnifiedTopology: true });
  try {
    const db = client.db('quetify-db');
    log(chalk.green(`Quetify Queue DB connected: ${args.server + '/quetify-db'}`));
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    // check if queue/collection names exists, create queue config collection if needed
    let config = null;
    if (!collectionNames.includes('quetify-config')) {
      log(chalk.green('Initializing quetify-config collection...'));
      config = await db.createCollection('quetify-config');
    } else {
      log(chalk.green('Connecting to quetify-config...'));
      config = db.collection('quetify-config');
    }

    if (collectionNames.includes(args.q)) {
      log(chalk.red(`Queue ${args.q} already exists. Ignoring command.`));
    } else {
      // create queue collection
      await db.createCollection(args.q);
      // create needed indexes
      log(chalk.green(`Created queue collection ${args.q}...`));
      // create config doc
      await config.insertOne({
        queue: args.q,
        retryLimit: args.r || 5,
        usePriority: args.p || false,
        type: args.type && args.type.toLowerCase() === 'stack' ? 'stack' : 'fifo'
      });
      log(chalk.green('Created config doc.'));
      // We're all done. close the connection
    }
  } catch (err) {
    log(chalk.red(`An error occured while creating your Queue ${err}`));
  }

  client.close();
}