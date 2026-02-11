const validateData = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    } catch (e) {
        return res.status(400).json({ 
            error: 'Datos inválidos', 
            details: e.errors 
        });
    }
};

module.exports = validateData;
