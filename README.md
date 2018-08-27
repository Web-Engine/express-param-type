# express param type
Use express param like Flask

## How to install

```bash
npm install express-param-type --save
```

## How to use
```javascript
var express = require('express');
require('express-param-type');

var app = express();
app.get('/<age:int>', function (req, res) {
    // req.params.age will number
    
    res.send('Your age is ' + (req.params.age + 10));
});
```
