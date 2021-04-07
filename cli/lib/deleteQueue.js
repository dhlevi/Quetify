const MongoClient = require('mongodb').MongoClient;
const chalk       = require('chalk');
const log         = console.log;

/**
 * Delete a queue and its configuration. This will obviously also
 * delete all stored documents, and cannot be undone. 
 * @param {*} args 
 */
module.exports = async function deleteQueue (args) {
  log(chalk.green('Deleting Queue'));
  if (!args.q) {
    log(chalk.red('A queue name was not provided. You must supply a parameter for a queue name. See the --q parameter for details.'));
    return;
  }

  const client = await MongoClient.connect(args.server, { useUnifiedTopology: true });
  try {
    const db = client.db('quetify-db');
    log(chalk.green(`Quetify Queue DB connected: ${args.server + '/quetify-db'}`));
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    if (!collectionNames.includes('quetify-config')) {
      log(chalk.red('Warning: Quetify does not appear to be configured on this server.'));
    } else {
      log(chalk.green('Connecting to quetify-config...'));
      const config = db.collection('quetify-config');

      if (!collectionNames.includes(args.q)) {
        log(chalk.red(`Queue ${args.q} does not exist. Ignoring command.`));
      } else {
        // delete queue collection
        await db.collection(args.q).drop();
        // delete config doc
        await config.deleteOne({ queue: args.q });
        log(chalk.green(`Queue ${args.q} deleted.`));
      }
    }
  } catch (err) {
    log(chalk.red(`An error occured while deleting your Queue ${err}`));
  }

  client.close();
}
