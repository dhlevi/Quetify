const MongoClient = require('mongodb').MongoClient;
const chalk       = require('chalk');
const log         = console.log;

/**
 * A listing of all available queues. If you do not have a Quetify database
 * configured yet, an error will be thrown
 * @param {*} args 
 */
module.exports = async function list (args) {
  const client = await MongoClient.connect(args.server, { useUnifiedTopology: true });

  try {
    const db = client.db('quetify-db');
    log(chalk.green(`Quetify Queue DB connected: ${args.server + '/quetify-db'}`));
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    if (!collectionNames.includes('quetify-config')) {
      log(chalk.red('Warning: Quetify does not appear to be configured on this server.'));
    } else {
      log(chalk.underline('Available Queues:'));
      for (const collection of collectionNames) {
        if (collection !== 'quetify-config') {
          log(` |- ${collection}`);
        }
      }
    }
  } catch (err) {
    log(chalk.red(`An error occured while creating your Queue ${err}`));
  }

  client.close();
}