const DocumentClient = require('./src')

async function main () {
  const docs = new DocumentClient()

  docs.load({
    TableName: 'UserRegistrationTokens',
    PrimaryKey: 'email',
    Items: [
      { email: 'asdf@asdf.com', registrationToken: 'asdfasdfasdf', pollingToken: 'fdsadfas' }
    ]
  })

  const res = await docs.get({
    TableName: 'UserRegistrationTokens',
    Key: { email: 'asdf@asdf.com' }
  }).promise()

  console.log('GET:', res)

  const updateExisting = await docs.update({
    TableName: 'UserRegistrationTokens',
    Key: { email: 'asdf@asdf.com' },
    UpdateExpression: 'SET registrationToken = :something, SET pollingToken = :somethingElse',
    ExpressionAttributeValues: {
      ':something': 'something',
      ':somethingElse': 'reallySomethingElse'
    },
    ReturnValues: 'UPDATED_NEW'
  }).promise()

  console.log('UPDATE:', updateExisting)
}

main()
