const jwt = require("jsonwebtoken");
const {verifyAccessToken} = require("../utils/jwt.js");
const authMiddleware = (req, res, next) => {
    
    const authHeader = req.headers.authorization;

    if(!authHeader){
        return res.status(401).json({error : "Token missing"});
    }
    if(!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];
    try{
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    }
    catch(err){
        return res.status(401).json({error : "Invalid or expired token"});
    }
        
    
};

module.exports = authMiddleware;