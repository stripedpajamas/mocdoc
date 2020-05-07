# mocdoc

Run in-memory DynamoDB instances for parallel testing (e.g. [Ava](https://github.com/avajs/ava)). Heavily inspired by [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server); backed by [Dynalite](https://github.com/mhart/dynalite).

## Install
```shell
npm install --save-dev mocdoc
```

## Use
```javascript
const AWS = require('aws-sdk')
const { DynamoDBMemoryServer } = require('mocdoc')

const DynamoDB = new DynamoDBMemoryServer()
const endpoint = await DynamoDB.getEndpoint()

const dynamoClient = AWS.DynamoDB({ endpoint })
```

## Todo
- [ ] Debug logging

## License
MIT
