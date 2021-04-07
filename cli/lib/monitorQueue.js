const MongoClient = require('mongodb').MongoClient;
const chalk       = require('chalk');
const Sparkline   = require('clui').Sparkline;
const Spinner     = require('clui').Spinner;
const log         = console.log;

/**
 * Monitor allows you to monitor a queue, or all queues. A simple
 * sparkline is displayed and updated showing the number of
 * requests, acknowledgements, and errors a queue has recieved
 * over the last few seconds. Meant primarily has a health
 * check than any advanced monitoring
 * @param {*} args 
 */
module.exports = async function monitor (args) {
  // connect to server, create queue db if needed
  const client = await MongoClient.connect(args.server, { useUnifiedTopology: true });
  try {
    const db = client.db('quetify-db');
    log(chalk.green(`Quetify Queue DB connected: ${args.server + '/quetify-db'}`));
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    const queueStats = {};
    setInterval(async function () {
      console.clear();
      log(chalk.green('Monitoring Queues:'));
      for (const collectionName of collectionNames) {
        if (collectionName !== 'quetify-config' && (!args.q || (args.q && collectionName === args.q))) {
          if (!queueStats[collectionName]) {
            queueStats[collectionName] = {};
            queueStats[collectionName].req = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
            queueStats[collectionName].awk = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
            queueStats[collectionName].err = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
          }

          // fetch the latest counts
          // push onto the end, pop the first
          try {
            queueStats[collectionName].req = queueStats[collectionName].req.slice(1, queueStats[collectionName].req.length);
            queueStats[collectionName].awk = queueStats[collectionName].awk.slice(1, queueStats[collectionName].awk.length);
            queueStats[collectionName].err = queueStats[collectionName].err.slice(1, queueStats[collectionName].err.length);

            // filter counts by date
            let rCount = await db.collection(collectionName).count({ enqueueTime: { $gt: new Date().getTime() - 1000 } });
            rCount += await db.collection(collectionName).count({ enqueueTime: { $gt: new Date().getTime() - 1000 } });
            const aCount = await db.collection(collectionName).count({ acknowledgedTime: { $gt: new Date().getTime() - 1000 }  });
            const eCount = await db.collection(collectionName).count({ errorTime: { $gt: new Date().getTime() - 1000 }  });

            queueStats[collectionName].req.push(rCount);
            queueStats[collectionName].awk.push(aCount);
            queueStats[collectionName].err.push(eCount);

            log(chalk.yellow('-------------------------' + collectionName + '-------------------------'));
            log(chalk.yellow('Requests:  ') + Sparkline(queueStats[collectionName].req, 'reqs/sec'));
            log(chalk.green('Completed: ') + Sparkline(queueStats[collectionName].awk, 'reqs/sec'));
            log(chalk.red('Errors:    ') + Sparkline(queueStats[collectionName].err, 'reqs/sec'));
            log();
          } catch (err) {
            client.close();
            log(chalk.red('Error during polling: ' + err));
          }
        }
      }
    }, 1000);
  } catch (err) {
    log(chalk.red(`An error occured while monitoring your Queue: ${err}`));
    client.close();
  }
}