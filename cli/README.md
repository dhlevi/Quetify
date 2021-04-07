# Quetify CLI

The Quetify CLI is a command line utility to assist with the management of Quetify Queues. For more information on Quetify and how it works, read the readme at the root of this repo.

You can use the same basic commands via the Quetify client as well, but it's recommended to manage your queues via the CLI to prevent errors.

Remember to include any required authentication on your mongodb server string, and do not include a DB name as quetify manages its own DB for queues and configurations. You'll have to make sure the authentication supplied has permissions to create a DB or collection on your server!

## Commands

The CLI has five main commmands

- Create
- Delete
- Clear
- Flush
- Monitor

And three parameters, some being optional depending on the command you're using

- `-s, -server` Your mongodb server. Do not include a Database name
- `-q, -queuename` The name of the queue, required for create, delete, clear, flush
- `-t, -type` Optional on create. The type of queue, either `FIFO` or `Stack`. Default is `FIFO`
- `-p, -priority` Option on create. A boolean value indicating that the queue should use priority for dequeuing. True or False. Default is `false`
- `-r, -retrylimit` Option on create. The retry limit when a message is flagged as an error. Marking a message as error will re-queue it until the limit is reached. Can be any positive integer, default is `5`

### create

Usage:

```bash
quetify create -q my-queue -s mongodb://localhost:27017/ -t FIFO -r 10 -p true
```

This will create a new Queue. If you have not created a queue before, this will also create the Quetify database and config collection. Quetify handles queues and configurations in its own database, to keep your primary collections and databases clean.

The Quetify database is called `quetify-db`. A default collection is created called `quetify-config`, which contains the configurations for queues.

### delete

Usage:

```bash
quetify delete -q my-queue -s mongodb://localhost:27017/
```

This will delete an existing queue. If the queue name doesn't exist, nothing will happen. If a queue name does exist, it will be immediately and concisely destroyed, without prejudice, feeling, or ceremony. This obviously cannot be undone, so use with caution.

### flush

Usage:

```bash
quetify flush -q my-queue -s mongodb://localhost:27017/
```

This will empty the contents of a queue. Flush will destroy all documents in a queue, including queued, dequeued, acknowledged, and error documents. This cannot be undone, so use with caution.

It's a mongodb collection under the hood, of course, so feel free to manage your data in whatever way makes sense for you.

### clear

Usage:

```bash
quetify clear -q my-queue -s mongodb://localhost:27017/
```

This will empty the acknowledged contents of a queue, and leave queued, dequeued and error documents untouched. Useful for removing documents that may no longer provide any value.

It's a mongodb colleciton under the hood, of course, so feel free to manage your data in whatever way makes sense for you.

### monitor

Usage:

```bash
quetify monitor -q my-queue -s mongodb://localhost:27017/
```

This will open up a small monitoring sparkline for your queue. If you leave out a queue name, it will monitor all queues in the Quetify database.

The monitor will show the number of requests per second for enqueued, acknowledged, and error messages.
