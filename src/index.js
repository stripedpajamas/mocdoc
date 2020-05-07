const debug = require('debug')('mocdoc')

const Dynalite = require('dynalite')
const getPort = require('get-port')

const startDynamo = (dynamo, host, port) => new Promise((resolve, reject) => {
  dynamo.listen(port, host, (err) => {
    if (err) { return reject(err) }
    return resolve()
  })
})

class DynamoDBMemoryServer {
  constructor (opts = {}) {
    this.instance = Dynalite({ createTableMs: 15 })
    this.started = false
    this.host = opts.host || '127.0.0.1'
    this.port = opts.port

    this.getPort = getPort
  }

  async getEndpoint () {
    const host = this.host
    const port = this.port || await this.getPort()

    this.port = port

    const endpoint = `http://${host}:${port}`

    if (!this.started) {
      debug('starting dynalite instance on %s:%s', this.host, this.port)
      await startDynamo(this.instance, host, port)
      this.started = true
    }

    return endpoint
  }

  async close () {
    if (this.started) {
      debug('stopping dynalite instance on %s:%s', this.host, this.port)
      this.instance.close()
      this.started = false
    }
  }
}

module.exports = { DynamoDBMemoryServer }
