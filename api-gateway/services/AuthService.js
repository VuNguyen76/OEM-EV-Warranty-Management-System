import jwt from 'jsonwebtoken';

export class AuthService {
    constructor(secrect) {
        this.secrect = secrect;
    }
    authenticate(req, res, next) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, this.secrect);
            req.user = decoded;
            next();
        } catch (err) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
    }
}