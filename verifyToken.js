const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    const tokenVal = req.body.userId;
    const token = tokenVal.split(" ")[1];
    if(!token)
        return res.status(401).send('Access Denied');

    try{
        const verified = jwt.verify(token, 'mann vora secret');
        req.body.userId = verified.id;
    } catch {
        res.status(400).send('Invalid Token');
    }
    next();
}