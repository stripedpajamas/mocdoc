const promiseOrCallbackWithErrorAndData = (error, data, cb) => {
  if (typeof cb === 'function') {
    return cb(error, data)
  }
  return { promise: () => error ? Promise.reject(error) : Promise.resolve(data) }
}

const parseUpdateExpression = (expr, names, values) => {
  // Within each clause, there are one or more actions separated by commas.
  // Each action represents a data modification.
  const SUPPORTED_ACTIONS = new Set(['SET']) // only supporting SET right now

  const actions = [] // { actionName, path, value }
  const exprTokens = expr.split(' ')
  while (exprTokens.length) {
    const actionName = exprTokens.shift()
    switch (actionName) {
      case 'SET': {
        const pathRaw = exprTokens.shift()
        const path = typeof names[pathRaw] !== 'undefined' ? names[pathRaw] : pathRaw
        exprTokens.shift() // =
        let valueRaw = exprTokens.shift()
        if (valueRaw[valueRaw.length - 1] === ',') {
          valueRaw = valueRaw.slice(0, valueRaw.length - 1)
        }
        const value = typeof values[valueRaw] !== 'undefined' ? values[valueRaw] : valueRaw
        actions.push({ actionName, path, value })
        break
      }
      default:
        break
    }

    const next = exprTokens[0]
    if (next && !SUPPORTED_ACTIONS.has(next)) {
      // if next token isn't a new clause,
      // reloop pretending to be whatever we were doing previously
      exprTokens.unshift(actionName)
    }
  }
  return actions
}

class MockDocumentClient {
  constructor () {
    this.tables = new Map() // TableName: String -> { PrimaryKey: String, Data: Map }
  }

  load ({ TableName, PrimaryKey, Items }) {
    if (typeof PrimaryKey !== 'string') {
      throw new Error('Primary Key must be specified and must be a string')
    }
    if (this.tables.has(TableName)) {
      const table = this.tables.get(TableName)
      if (table.PrimaryKey !== PrimaryKey) {
        throw new Error(`Table already exists with different primary key: ${table.PrimaryKey}`)
      }
    } else {
      this.tables.set(TableName, { PrimaryKey, Data: new Map() })
    }
    Items.forEach((Item) => this.put({ TableName, Item }))
  }

  put ({ TableName, Item, ...Params }, cb) {
    if (!this.tables.has(TableName)) {
      return promiseOrCallbackWithErrorAndData(
        new Error(`TableName ${TableName} does not exist`), null, cb
      )
    }
    const table = this.tables.get(TableName)
    if (typeof Item[table.PrimaryKey] === 'undefined') {
      return promiseOrCallbackWithErrorAndData(
        new Error('Incorrect key attribute'), null, cb
      )
    }

    table.Data.set(Item[table.PrimaryKey], Item)

    return promiseOrCallbackWithErrorAndData(null, null, cb)
  }

  get ({ TableName, Key }, cb) {
    if (!this.tables.has(TableName)) {
      return promiseOrCallbackWithErrorAndData(
        new Error(`TableName ${TableName} does not exist`), null, cb
      )
    }
    const table = this.tables.get(TableName)
    if (typeof Key[table.PrimaryKey] === 'undefined') {
      return promiseOrCallbackWithErrorAndData(
        new Error('Incorrect key attribute'), null, cb
      )
    }

    const Item = table.Data.get(Key[table.PrimaryKey])

    return promiseOrCallbackWithErrorAndData(null, { Item }, cb)
  }

  delete ({ TableName, Key, ...Params }, cb) {
    if (!this.tables.has(TableName)) {
      return promiseOrCallbackWithErrorAndData(
        new Error(`TableName ${TableName} does not exist`), null, cb
      )
    }
    const table = this.tables.get(TableName)
    if (typeof Key[table.PrimaryKey] === 'undefined') {
      return promiseOrCallbackWithErrorAndData(
        new Error('Incorrect key attribute'), null, cb
      )
    }
    const Item = table.Data.get(Key[table.PrimaryKey])
    table.Data.delete(Key[table.PrimaryKey])

    if (Params.ReturnValues === 'ALL_OLD') {
      return promiseOrCallbackWithErrorAndData(null, { Item }, cb)
    }
    return promiseOrCallbackWithErrorAndData(null, null, cb)
  }

  update ({ TableName, Key, UpdateExpression, ...Params }, cb) {
    if (!this.tables.has(TableName)) {
      return promiseOrCallbackWithErrorAndData(
        new Error(`TableName ${TableName} does not exist`), null, cb
      )
    }
    const table = this.tables.get(TableName)
    const key = Key[table.PrimaryKey]
    if (typeof key === 'undefined') {
      return promiseOrCallbackWithErrorAndData(
        new Error('Incorrect key attribute'), null, cb
      )
    }

    const Item = table.Data.get(key)
    const names = Params.ExpressionAttributeNames || {}
    const values = Params.ExpressionAttributeValues || {}
    const updateActions = parseUpdateExpression(UpdateExpression, names, values)

    let updatedItem = Item
    const oldUpdatedAttributes = {}
    const newUpdatedAttributes = {}
    updateActions.forEach(({ actionName, path, value }) => {
      switch (actionName) {
        case 'SET': {
          oldUpdatedAttributes[path] = Item[path]
          newUpdatedAttributes[path] = value
          updatedItem = Object.assign({}, updatedItem, { [path]: value })
          table.Data.set(key, updatedItem)
          break
        }
        default:
          break
      }
    })

    switch (Params.ReturnValues) {
      case 'ALL_NEW':
        return promiseOrCallbackWithErrorAndData(null, { Attributes: updatedItem }, cb)
      case 'ALL_OLD':
        return promiseOrCallbackWithErrorAndData(null, { Attributes: Item }, cb)
      case 'UPDATED_NEW':
        return promiseOrCallbackWithErrorAndData(null, { Attributes: newUpdatedAttributes }, cb)
      case 'UPDATED_OLD':
        return promiseOrCallbackWithErrorAndData(null, { Attributes: oldUpdatedAttributes }, cb)
      default:
        return promiseOrCallbackWithErrorAndData(null, {}, cb)
    }
  }
}

module.exports = MockDocumentClient
