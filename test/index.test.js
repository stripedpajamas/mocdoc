const test = require('ava')
const sinon = require('sinon')
const Dynalite = require('dynalite')
const { DynamoDBMemoryServer } = require('../')

test.beforeEach((t) => {
  const dynaliteMock = sinon.stub(new Dynalite())

  t.context.server = new DynamoDBMemoryServer()
  t.context.server.instance = dynaliteMock
  t.context.server.getPort = sinon.stub().resolves(1234)
})

test('getEndpoint | starts instance', async (t) => {
  const { server } = t.context

  server.instance.listen.callsArg(2)

  const endpoint = await server.getEndpoint()
  t.is(endpoint, 'http://127.0.0.1:1234')
  t.is(server.started, true)
  t.true(server.instance.listen.calledOnce)
})

test('getEndpoint | already started', async (t) => {
  const { server } = t.context

  server.started = true

  const endpoint = await server.getEndpoint()
  t.is(endpoint, 'http://127.0.0.1:1234')

  t.true(server.instance.listen.notCalled)
})

test('getEndpoint | dynalite error bubbles up', async (t) => {
  const { server } = t.context

  server.instance.listen.callsArgWith(2, new Error('dynalite failure'))

  await t.throwsAsync(() => server.getEndpoint(), { message: 'dynalite failure' })
})

test('close when stopped', async (t) => {
  const { server } = t.context

  await server.close()

  t.true(server.instance.close.notCalled)
})

test('close when started', async (t) => {
  const { server } = t.context

  server.started = true
  await server.close()

  t.true(server.instance.close.calledOnce)
  t.false(server.started)
})
